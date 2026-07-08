# Search Cursor Local History for platform or related files
$historyPath = "C:\Users\DELL\AppData\Roaming\Cursor\User\History"
$files = Get-ChildItem -Path $historyPath -Filter "entries.json" -Recurse

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        if ($content -like "*platform*" -or $content -like "*AuthContext*" -or $content -like "*SongCard*" -or $content -like "*rules*") {
            Write-Host "Found in entries: $($file.FullName)" -ForegroundColor Green
            Write-Host $content -ForegroundColor Gray
        }
    } catch {
        # ignore read errors
    }
}
