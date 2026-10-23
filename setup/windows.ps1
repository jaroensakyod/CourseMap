# CourseMap — ตัวติดตั้งสำหรับ Windows 10/11 (มีหรือไม่มีการ์ดจอก็ได้)
# รันจากโฟลเดอร์ที่ clone มา:  powershell -ExecutionPolicy Bypass -File setup\windows.ps1
# (หรือดับเบิลคลิก setup\windows.bat · หรือบอก Claude ในโฟลเดอร์นี้ว่า "ติดตั้งให้หน่อย")
#
# ลง git, Node.js LTS, ffmpeg → npm install → .env → เลือกโหมดการ์ดจอ → ภาพทดสอบ → คลังเสียง → ข้อมูลแผนที่
# → Whisper → ตรวจเครื่อง. รันซ้ำได้ ไม่ลบงานเดิม. ตั้ง SKIP_WHISPER=1 / SKIP_DATA=1 เพื่อข้ามส่วนที่โหลดนาน

function Install-CourseMap {
  [Console]::OutputEncoding = [Text.Encoding]::UTF8
  $ProgressPreference = 'SilentlyContinue'
  $project = Split-Path -Parent $PSScriptRoot

  function Step($msg) { Write-Host ''; Write-Host "==> $msg" -ForegroundColor Cyan }
  function Ok($msg) { Write-Host "    OK  $msg" -ForegroundColor Green }
  function Warn($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }
  function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
  function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
    foreach ($p in "$env:USERPROFILE\.local\bin", "$env:LOCALAPPDATA\Microsoft\WinGet\Links") { if ((Test-Path $p) -and ($env:Path -notlike "*$p*")) { $env:Path += ";$p" } }
  }

  Write-Host "โฟลเดอร์งาน: $project"
  if ($project.Length -gt 40 -or $project -match '[^\x00-\x7F]') {
    Warn 'ตำแหน่งโฟลเดอร์ยาวหรือมีภาษาไทย — Remotion/npm บน Windows อาจพัง แนะนำย้ายไป C:\maps\CourseMap แล้วรันใหม่'
  }

  Step '1/9 ลงเครื่องมือ (git, Node.js, ffmpeg)'
  $tools = @(
    @{ cmd = 'git'; id = 'Git.Git'; name = 'git' },
    @{ cmd = 'node'; id = 'OpenJS.NodeJS.LTS'; name = 'Node.js LTS' },
    @{ cmd = 'ffmpeg'; id = 'Gyan.FFmpeg'; name = 'ffmpeg' }
  )
  foreach ($t in $tools) {
    if (Has $t.cmd) { Ok "$($t.name) มีแล้ว"; continue }
    if (-not (Has 'winget')) {
      Write-Host '    ไม่พบ winget — เปิด Microsoft Store ค้นหา "App Installer" กด Update/Install แล้วรันใหม่' -ForegroundColor Red
      return
    }
    Write-Host "    กำลังลง $($t.name) ... (ถ้ามีหน้าต่างขออนุญาต ให้กด Yes)"
    winget install --id $t.id -e --silent --accept-package-agreements --accept-source-agreements | Out-Host
    Refresh-Path
    if (Has $t.cmd) { Ok "$($t.name) ลงแล้ว" } else { Warn "$($t.name) ยังไม่เจอ — ปิดหน้าต่างนี้ เปิดใหม่ แล้วรันซ้ำ"; return }
  }
  $major = [int]((node -v) -replace '^v(\d+).*', '$1')
  if ($major -lt 18) { Warn "Node $(node -v) เก่าเกินไป (ต้อง 18 ขึ้นไป) — รัน: winget upgrade OpenJS.NodeJS.LTS"; return }

  Push-Location $project
  try {
    Step '2/9 npm install (ครั้งแรก 2-5 นาที)'
    npm.cmd install --no-audit --no-fund | Out-Host
    if ($LASTEXITCODE -ne 0) { Warn 'npm install ไม่ผ่าน — ส่งภาพหน้าจอนี้ให้ครู'; return }
    Ok 'ลงแพ็กเกจแล้ว'
    node scripts/sb-sync.mjs | Out-Null

    Step '3/9 ไฟล์ .env (ที่ใส่ Gemini API key)'
    if (Test-Path '.env') { Ok 'มี .env แล้ว (ไม่ทับ)' } else { Copy-Item '.env.example' '.env'; Ok 'สร้าง .env แล้ว' }

    Step '4/9 เช็กการ์ดจอ แล้วเลือกโหมดเรนเดอร์ที่ใช้ได้'
    $gpus = (Get-CimInstance Win32_VideoController | ForEach-Object Name) -join ', '
    Write-Host "    การ์ดจอ: $gpus"
    $chosen = $null
    foreach ($gl in 'vulkan', 'angle') {
      Write-Host "    ลองโหมด $gl ... (ครั้งแรกจะโหลด Chrome สำหรับเรนเดอร์ก่อน)"
      $sw = [Diagnostics.Stopwatch]::StartNew()
      npx.cmd remotion render MapTest out/gl-test.mp4 --frames=0-29 --gl=$gl --log=error | Out-Null
      if ($LASTEXITCODE -eq 0) { $chosen = $gl; Ok "$gl ใช้ได้ ($([int]$sw.Elapsed.TotalSeconds) วินาที)"; break }
      Warn "$gl ใช้ไม่ได้บนเครื่องนี้"
    }
    $config = Join-Path $project 'remotion.config.ts'
    $text = Get-Content $config -Raw
    if ($chosen) { $text = $text -replace 'setChromiumOpenGlRenderer\("\w+"\)', "setChromiumOpenGlRenderer(`"$chosen`")" }
    else { $text = $text -replace '(?m)^Config\.setChromiumOpenGlRenderer.*\r?\n', ''; Warn 'ใช้โหมด CPU ล้วน (ช้ากว่าแต่ใช้ได้)' }
    [IO.File]::WriteAllText($config, $text)
    Remove-Item out\gl-test.mp4 -ErrorAction SilentlyContinue

    Step '5/9 เรนเดอร์ภาพทดสอบ'
    npx.cmd remotion still MapTest out/test.png --frame=140 --log=error | Out-Null
    if ($LASTEXITCODE -eq 0) { Ok "ได้ภาพ $project\out\test.png" } else { Warn 'เรนเดอร์ไม่ผ่าน — บอก Claude ว่า "เรนเดอร์ MapTest ไม่ผ่าน ช่วยแก้"' }

    Step '6/9 เสียงประกอบ (เสียง UI + คลังเสียงจริง Mixkit/Pixabay)'
    node scripts/sfx.mjs | Out-Null
    node scripts/sfx-lib.mjs | Out-Host
    if ($LASTEXITCODE -eq 0) { Ok 'คลังเสียงพร้อม' } else { Warn 'บางเสียงโหลดไม่ได้ — รัน npm run sfx-lib ซ้ำทีหลังได้' }

    Step '7/9 ข้อมูลแผนที่และภาพดาวเทียม (~200 MB)'
    if ($env:SKIP_DATA) { Warn 'ข้าม (SKIP_DATA) — รัน npm run setup:data ทีหลัง' } else { node setup/data.mjs | Out-Host }

    Step '8/9 Whisper (จับเวลาคำพูด ~1.5 GB)'
    if ($env:SKIP_WHISPER) { Warn 'ข้าม (SKIP_WHISPER) — รัน npm run setup:whisper ทีหลัง' } else {
      node setup/whisper.mjs | Out-Host
      if ($LASTEXITCODE -eq 0) { Ok 'Whisper พร้อม' } else { Warn 'ลง Whisper ไม่สำเร็จ — รัน npm run setup:whisper ซ้ำ' }
    }
    if ($gpus -match 'NVIDIA') { Ok 'มีการ์ด NVIDIA — ทำคลิปแรกได้แล้ว สั่ง Claude ตั้ง Whisper แบบ CUDA จะเร็วขึ้น ~7 เท่า' }

    Step '9/9 ตรวจเครื่อง'
    node setup/doctor.mjs | Out-Host
  } finally { Pop-Location }

  $envFile = Join-Path $project '.env'
  if (-not (Select-String -Path $envFile -Pattern '^\s*GEMINI_API_KEY\s*=\s*\S{20,}' -Quiet)) {
    Write-Host ''
    Write-Host '    เปิด .env ใน Notepad — วาง key ต่อจาก GEMINI_API_KEY= แล้วกด Ctrl+S (ขอ key ฟรี: https://aistudio.google.com/apikey)'
    Start-Process notepad.exe $envFile
  }
  Write-Host ''
  Write-Host '==================== เสร็จแล้ว ====================' -ForegroundColor Green
  Write-Host ' ต่อไป: ใส่ key ใน .env → บอก Claude ว่า "ทดลองทำคลิปตัวอย่าง" (npm run demo)'
  Write-Host '==================================================='
}

Install-CourseMap
