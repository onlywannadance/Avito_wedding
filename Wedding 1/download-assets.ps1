$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$dirs = @("assets/css", "assets/js", "assets/images", "assets/fonts", "assets/audio")
foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

function Get-LocalPath($url) {
    $url = $url -replace '\?.*$', ''
    if ($url -match 'fonts\.googleapis\.com') { return "assets/css/google-fonts.css" }
    if ($url -match 'fonts\.gstatic\.com') {
        $name = Split-Path $url -Leaf
        return "assets/fonts/$name"
    }
    if ($url -match 'static\.tildacdn\.com/css/') {
        return "assets/css/" + (Split-Path $url -Leaf)
    }
    if ($url -match 'static\.tildacdn\.com/js/') {
        return "assets/js/" + (Split-Path $url -Leaf)
    }
    if ($url -match 'static\.tildacdn\.com/ws/') {
        $name = (Split-Path $url -Leaf) -replace '\?.*$', ''
        if ($name -match '\.css$') { return "assets/css/$name" }
        return "assets/js/$name"
    }
    if ($url -match 'neo\.tildacdn\.com') {
        return "assets/js/" + (Split-Path $url -Leaf)
    }
    if ($url -match 'cdn\.postnikovmd\.com') {
        return "assets/js/" + (Split-Path $url -Leaf)
    }
    if ($url -match 'static\.tildacdn\.com/tild') {
        $name = Split-Path $url -Leaf
        if ($name -match '\.(woff2?|ttf|otf)$') { return "assets/fonts/$name" }
        return "assets/images/$name"
    }
    if ($url -match 'dropbox\.com.*\.mp3') {
        return "assets/audio/background.mp3"
    }
    return $null
}

function Download-File($url, $localPath) {
    if (-not $localPath) { return $false }
    $fullPath = Join-Path $root $localPath
    if ((Test-Path $fullPath) -and (Get-Item $fullPath).Length -gt 0) {
        return $true
    }
    $dir = Split-Path $fullPath -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    curl.exe -sL --fail "$url" -o "$fullPath" 2>$null
    return ((Test-Path $fullPath) -and (Get-Item $fullPath).Length -gt 0)
}

$html = Get-Content -Raw "source.html"
$urls = [regex]::Matches($html, 'https?://[^"''\s\)<>]+') | ForEach-Object { $_.Value } | Sort-Object -Unique

$pageCss = Get-Content -Raw "page.css" -ErrorAction SilentlyContinue
if ($pageCss) {
    $cssUrls = [regex]::Matches($pageCss, 'https?://[^"''\s\)]+') | ForEach-Object { $_.Value }
    $urls = ($urls + $cssUrls) | Sort-Object -Unique
}

$thumbToFull = @{
    'https://thb.tildacdn.com/tild6164-3162-4665-b264-633732393030/-/resize/20x/noroot.png' = 'https://static.tildacdn.com/tild6164-3162-4665-b264-633732393030/noroot.png'
    'https://thb.tildacdn.com/tild3837-3736-4063-b234-383239643833/-/resize/20x/Group_248_1.png' = 'https://static.tildacdn.com/tild3837-3736-4063-b234-383239643833/Group_248_1.png'
    'https://thb.tildacdn.com/tild6163-3366-4162-b131-616162626235/-/resize/20x/Group_28.png' = 'https://static.tildacdn.com/tild6163-3366-4162-b131-616162626235/Group_28.png'
    'https://thb.tildacdn.com/tild3762-3266-4264-a538-313938383962/-/resize/20x/_7_1.png' = 'https://static.tildacdn.com/tild3762-3266-4264-a538-313938383962/_7_1.png'
}

$downloadUrls = @()
foreach ($u in $urls) {
    if ($u -match 'mc\.yandex|wedbyvaleri\.ru/maket|yandex\.com/maps|ws\.tildacdn|fonts\.gstatic\.com$|static\.tildacdn\.com$|thb\.tildacdn') { continue }
    $downloadUrls += $u
}
foreach ($full in $thumbToFull.Values) { $downloadUrls += $full }
$downloadUrls = $downloadUrls | Sort-Object -Unique

Write-Host "Downloading $($downloadUrls.Count) assets..."
$map = @{}
$failed = @()
foreach ($url in $downloadUrls) {
    $local = Get-LocalPath $url
    if (-not $local) { continue }
    $ok = Download-File $url $local
    if ($ok) {
        $map[$url] = $local
        Write-Host "  OK: $local"
    } else {
        $failed += $url
        Write-Host "  FAIL: $url"
    }
}

$gfUrl = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&subset=latin,cyrillic"
$gfLocal = "assets/css/google-fonts.css"
if (Download-File $gfUrl $gfLocal) {
    $gfCss = Get-Content -Raw (Join-Path $root $gfLocal)
    $fontUrls = [regex]::Matches($gfCss, 'https://fonts\.gstatic\.com[^)]+') | ForEach-Object { $_.Value }
    foreach ($fu in $fontUrls) {
        $fl = Get-LocalPath $fu
        if (Download-File $fu $fl) {
            $map[$fu] = $fl
            $gfCss = $gfCss.Replace($fu, "../fonts/" + (Split-Path $fl -Leaf))
        }
    }
    Set-Content -Path (Join-Path $root $gfLocal) -Value $gfCss -Encoding UTF8
    $map[$gfUrl] = $gfLocal
    $map["https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400..900&family=Montserrat:wght@100..900&subset=latin,cyrillic"] = $gfLocal
}

$processedCss = $pageCss
foreach ($entry in ($map.GetEnumerator() | Sort-Object { $_.Key.Length } -Descending)) {
    $processedCss = $processedCss.Replace($entry.Key, "../" + ($entry.Value -replace '^assets/', ''))
}
$processedCss = $processedCss -replace "url\('\.\./fonts/", "url('../fonts/"
Set-Content -Path "assets/css/tilda-blocks-page143665736.min.css" -Value $processedCss -Encoding UTF8
$map['https://static.tildacdn.com/ws/project15229836/tilda-blocks-page143665736.min.css?t=1780217490'] = 'assets/css/tilda-blocks-page143665736.min.css'

$result = $html
foreach ($entry in ($map.GetEnumerator() | Sort-Object { $_.Key.Length } -Descending)) {
    $result = $result.Replace($entry.Key, $entry.Value)
}
foreach ($entry in $thumbToFull.GetEnumerator()) {
    $fullLocal = $map[$entry.Value]
    if ($fullLocal) { $result = $result.Replace($entry.Key, $fullLocal) }
}

$result = $result -replace '(?s)<!-- nominify begin --><style>\s*/\*.*?</style>\s*<script>.*?mods\.min\.js"></script><!-- nominify end -->', '<script src="assets/js/mods.min.js"></script>'
$result = $result -replace '(?s)<script>\s*document\.addEventListener\(''keydown''.*?</script>', ''
$result = $result -replace '<meta name="robots" content="noindex" />', ''
$result = $result -replace 'data-tilda-lazy="yes"', 'data-tilda-lazy="no"'
$result = $result -replace '<link href="https://fonts\.googleapis\.com/css2\?family=Playfair\+Display:wght@400\.\.900[^"]*" rel="stylesheet">', ''
$result = $result -replace '<link rel="preconnect" href="https://fonts\.gstatic\.com">', ''
$result = $result -replace '<body class="t-body"', '<body class="t-body allow-copy"'

Set-Content -Path "index.html" -Value $result -Encoding UTF8
Write-Host ""
Write-Host "Done! index.html created. Failed downloads: $($failed.Count)"
