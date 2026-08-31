param(
  [string]$SupabaseUrl = $env:GPTE_SUPABASE_URL,
  [string]$ServiceRoleKey = $env:GPTE_SUPABASE_SERVICE_ROLE_KEY,
  [string]$ManagementToken = $env:GPTE_SUPABASE_ACCESS_TOKEN,
  [switch]$DryRun,
  [string[]]$BookPaths = @(
    "$env:USERPROFILE\Downloads\Yo cocino latino Las mejore_ (z-library.sk, 1lib.sk, z-lib.sk)",
    "$env:USERPROFILE\Downloads\Cocinando para Latinos con_ (z-library.sk, 1lib.sk, z-lib.sk)",
    "$env:USERPROFILE\Downloads\Tulio en su salsa (Tulio Zu_ (z-library.sk, 1lib.sk, z-lib.sk)"
  )
)

# Importa recetas autorizadas desde EPUB sin copiar EPUB, imágenes ni vídeos al repositorio.
# Ejecutar después de aplicar la migración:
#   $env:GPTE_SUPABASE_URL='https://<proyecto>.supabase.co'
#   $env:GPTE_SUPABASE_SERVICE_ROLE_KEY='<clave solo local>'
#   .\scripts\import-recipe-books.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (-not $DryRun -and ([string]::IsNullOrWhiteSpace($SupabaseUrl) -or ([string]::IsNullOrWhiteSpace($ServiceRoleKey) -and [string]::IsNullOrWhiteSpace($ManagementToken)))) {
  throw 'Faltan GPTE_SUPABASE_URL y una clave de Supabase. No pongas estas claves en Vite, GitHub ni Vercel.'
}

function Get-Text([string]$Html) {
  $withBreaks = [regex]::Replace($Html, '<\s*(br|p|div|li|h[1-6])[^>]*>', "`n", 'IgnoreCase')
  $plain = [regex]::Replace($withBreaks, '<[^>]+>', ' ')
  $plain = [System.Net.WebUtility]::HtmlDecode($plain)
  return (($plain -replace '[\u00A0\t ]+', ' ' -replace '`r', '') -replace '`n\s*`n+', "`n").Trim()
}

function Get-FirstHeading([string]$Html) {
  $match = [regex]::Match($Html, '<h[1-6][^>]*>(.*?)</h[1-6]>', 'Singleline,IgnoreCase')
  if ($match.Success) { return ((Get-Text $match.Groups[1].Value) -replace '\s+', ' ').Trim() }
  $text = Get-Text $Html
  $firstBlock = ($text -split "`n") | Where-Object { $_.Trim().Length -gt 3 } | Select-Object -First 1
  if ($firstBlock) { return (($firstBlock -replace '\s+', ' ').Trim()) }
  return ''
}

function Get-Goal([string]$Text) {
  $t = $Text.ToLowerInvariant()
  if ($t -match 'postre|dulce|frito|fritura|caramelo|chorizo|salami|puerco|torta|alfajor|flan|tres leches|arequipe') { return 'subir' }
  if ($t -match 'ensalada|verdura|vegetal|ceviche|sopa|lenteja|garbanzo|fruta|aguacate|pescado|pollo a la plancha') { return 'bajar' }
  return 'mantener'
}

function Get-Category([string]$Name, [string]$Path) {
  $t = "$Name $Path".ToLowerInvariant()
  if ($t -match 'desay|arepa|huevo|waffle|chilaquil|colada|chocolate') { return 'desayuno' }
  if ($t -match 'postre|dulce|alfajor|flan|torta|pudín|mousse|nieve|tarta|coconete|coquito') { return 'snack' }
  if ($t -match 'sopa|ensalada|ceviche|coctel|guacamole') { return 'cena' }
  return 'almuerzo'
}

function Get-Tips([string]$Goal, [string]$Category) {
  if ($Goal -eq 'bajar') { return 'Prioriza la porción de verduras, mide el aceite y acompaña con agua. Si necesitas reducir calorías, disminuye frituras, salsas y azúcares añadidos.' }
  if ($Goal -eq 'subir') { return 'Aumenta la densidad energética con una porción adicional de arroz, tubérculo o legumbre y añade una fuente de proteína. Ajusta la porción a tu plan.' }
  return 'Sirve una porción equilibrada: mitad verduras, un cuarto de proteína y un cuarto de carbohidrato. Conserva refrigerado y recalienta completamente.'
}

function New-Recipe([string]$Book, [string]$Path, [string]$Html) {
  $title = Get-FirstHeading $Html
  if ([string]::IsNullOrWhiteSpace($title)) { return $null }
  $text = Get-Text $Html
  $ingredient = [regex]::Match($text, '(?is)(?:ingredientes|ingredients)\s*(.*?)(?=(?:preparación|preparation|¿cómo|how to)|$)').Groups[1].Value.Trim()
  if ([string]::IsNullOrWhiteSpace($ingredient)) {
    $ingredient = [regex]::Match($text, '(?is)(?:ingredientes|ingredients)\s*(.*?)(?=(?:@my|@|exchanges|intercambios|nutritional|información nutricional)|$)').Groups[1].Value.Trim()
  }
  $preparation = [regex]::Match($text, '(?is)(?:preparación|preparation|¿cómo[^\n]*|how to)\s*(.*?)(?=(?:ingredientes|ingredients|@my|@|exchanges|intercambios|nutritional|información nutricional)|$)').Groups[1].Value.Trim()
  if ([string]::IsNullOrWhiteSpace($ingredient) -or [string]::IsNullOrWhiteSpace($preparation)) { return $null }
  $goal = Get-Goal "$title $ingredient $preparation"
  [pscustomobject]@{
    id = [guid]::NewGuid().ToString()
    source_key = "$Book|$Path"
    name = $title
    category = Get-Category $title $Path
    ingredients = $ingredient
    instructions = $preparation
    goal = $goal
    tips = Get-Tips $goal (Get-Category $title $Path)
    source_book = $Book
    image_url = ''
    video_url = ''
    tags = @('libro', $goal)
  }
}

$recipes = [System.Collections.Generic.List[object]]::new()
foreach ($bookPath in $BookPaths) {
  if (-not (Test-Path -LiteralPath $bookPath)) { Write-Warning "No encontrado: $bookPath"; continue }
  $bookName = [IO.Path]::GetFileName($bookPath)
  $zip = [IO.Compression.ZipFile]::OpenRead($bookPath)
  try {
    foreach ($entry in $zip.Entries | Where-Object { $_.FullName -match '\.(xhtml|html)$' }) {
      $reader = [IO.StreamReader]::new($entry.Open())
      try { $html = $reader.ReadToEnd() } finally { $reader.Dispose() }
      $recipe = New-Recipe $bookName $entry.FullName $html
      if ($null -ne $recipe) { $recipes.Add($recipe) }
    }
  } finally { $zip.Dispose() }
}

if ($recipes.Count -eq 0) { throw 'No se encontraron recetas. Revisa los archivos EPUB y sus marcadores.' }

if ($DryRun) {
  Write-Host "Recetas detectadas: $($recipes.Count)"
  $recipes | Group-Object source_book | ForEach-Object { Write-Host ("  {0}: {1}" -f $_.Name, $_.Count) }
  $recipes | Select-Object -First 10 name, category, goal | Format-Table -AutoSize
  exit 0
}

if (-not [string]::IsNullOrWhiteSpace($ManagementToken)) {
  if ($SupabaseUrl -notmatch 'https://([a-z0-9]+)\.supabase\.co') { throw 'SupabaseUrl no tiene el formato esperado.' }
  $projectRef = $Matches[1]
  $payload = $recipes | ConvertTo-Json -Depth 6 -Compress
  $sql = @"
insert into public.meals (id, name, category, ingredients, instructions, image_url, video_url, goal, tips, source_book, source_key, tags)
select id, name, category, ingredients, instructions, nullif(image_url, ''), nullif(video_url, ''), goal, tips, source_book, source_key, tags
from jsonb_to_recordset(`$gpte`$payload`$gpte`$::jsonb) as x(
  id uuid, name text, category text, ingredients text, instructions text, image_url text, video_url text,
  goal text, tips text, source_book text, source_key text, tags text[]
)
on conflict (source_key) do update set
  name = excluded.name, category = excluded.category, ingredients = excluded.ingredients,
  instructions = excluded.instructions, image_url = excluded.image_url, video_url = excluded.video_url,
  goal = excluded.goal, tips = excluded.tips, source_book = excluded.source_book, tags = excluded.tags;
"@ -replace 'payload', $payload
  $headers = @{ Authorization = "Bearer $ManagementToken"; 'Content-Type' = 'application/json' }
  Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" -Method Post -Headers $headers -Body (@{query=$sql} | ConvertTo-Json -Depth 5) | Out-Null
  Write-Host "Importadas o actualizadas mediante la API de gestión: $($recipes.Count) recetas."
  exit 0
}

$headers = @{ Authorization = "Bearer $ServiceRoleKey"; apikey = $ServiceRoleKey; 'Content-Type' = 'application/json'; Prefer = 'resolution=merge-duplicates,return=minimal' }
$endpoint = "$($SupabaseUrl.TrimEnd('/'))/rest/v1/meals?on_conflict=source_key"
foreach ($recipe in $recipes) {
  $body = $recipe | ConvertTo-Json -Depth 5 -Compress
  Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers -Body $body | Out-Null
}

Write-Host "Importadas o actualizadas: $($recipes.Count) recetas."
Write-Host 'Las imágenes quedan vacías para que el administrador agregue URLs externas sin usar Supabase Storage.'
