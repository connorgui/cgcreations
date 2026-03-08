param([int]$Port = 8080)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$analyticsPath = Join-Path $root 'analytics.json'
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")

function Get-AnalyticsData {
  if (-not (Test-Path $analyticsPath -PathType Leaf)) {
    $initial = [pscustomobject]@{
      uniqueUsers = 0
      knownIps = @()
    }
    Save-AnalyticsData -analytics $initial
    return $initial
  }

  $raw = Get-Content $analyticsPath -Raw | ConvertFrom-Json
  $knownIps = if ($raw.PSObject.Properties['knownIps']) { @($raw.knownIps) } else { @() }
  $normalized = [pscustomobject]@{
    uniqueUsers = $knownIps.Count
    knownIps = $knownIps
  }

  if (($raw.PSObject.Properties['knownIps'] -eq $null) -or ([int]$raw.uniqueUsers -ne $normalized.uniqueUsers)) {
    Save-AnalyticsData -analytics $normalized
  }

  return $normalized
}

function Save-AnalyticsData {
  param([Parameter(Mandatory = $true)]$analytics)
  $analytics | ConvertTo-Json -Depth 6 | Set-Content -NoNewline $analyticsPath
}

function Get-RequestBody {
  param($request)
  $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Close()
  }
}

function Send-TextResponse {
  param(
    $context,
    [int]$statusCode,
    [string]$content,
    [string]$contentType = 'text/plain; charset=utf-8'
  )

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
  $context.Response.StatusCode = $statusCode
  $context.Response.ContentType = $contentType
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}

function Send-JsonResponse {
  param($context, [int]$statusCode, $data)
  $json = $data | ConvertTo-Json -Depth 6
  Send-TextResponse -context $context -statusCode $statusCode -content $json -contentType 'application/json; charset=utf-8'
}

$listener.Start()

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $path = $request.Url.AbsolutePath.TrimStart('/')

    if ($request.HttpMethod -eq 'GET' -and $path -eq 'api/analytics') {
      $analytics = Get-AnalyticsData
      Send-JsonResponse -context $context -statusCode 200 -data ([pscustomobject]@{ uniqueUsers = [int]$analytics.uniqueUsers })
      continue
    }

    if ($request.HttpMethod -eq 'POST' -and $path -eq 'api/visit') {
      $null = Get-RequestBody -request $request
      $ipAddress = $request.RemoteEndPoint.Address.ToString()
      $analytics = Get-AnalyticsData
      $knownIps = @($analytics.knownIps)
      if ($knownIps -notcontains $ipAddress) {
        $analytics.knownIps = $knownIps + $ipAddress
        $analytics.uniqueUsers = @($analytics.knownIps).Count
        Save-AnalyticsData -analytics $analytics
      }
      Send-JsonResponse -context $context -statusCode 200 -data ([pscustomobject]@{ uniqueUsers = [int]$analytics.uniqueUsers })
      continue
    }

    if ([string]::IsNullOrWhiteSpace($path)) {
      $path = 'index.html'
    }

    $filePath = Join-Path $root $path
    if (-not (Test-Path $filePath -PathType Leaf)) {
      Send-TextResponse -context $context -statusCode 404 -content 'Not Found'
      continue
    }

    $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $contentType = switch ($extension) {
      '.html' { 'text/html; charset=utf-8' }
      '.css' { 'text/css; charset=utf-8' }
      '.js' { 'application/javascript; charset=utf-8' }
      '.json' { 'application/json; charset=utf-8' }
      default { 'application/octet-stream' }
    }

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $context.Response.ContentType = $contentType
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}