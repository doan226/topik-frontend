param([Parameter(Mandatory=$true)][string]$ImagePath)

[void][Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStream, Windows.Storage, ContentType=WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime]
[void][Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType=WindowsRuntime]
[void][Windows.Globalization.Language, Windows.Globalization, ContentType=WindowsRuntime]

function Await-WinRT($asyncOp) {
    while ($asyncOp.Status -eq 'Started') {
        [System.Threading.Thread]::Sleep(10)
    }
    return $asyncOp.GetResults()
}

$file = Await-WinRT([Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath))
$stream = Await-WinRT($file.OpenAsync([Windows.Storage.FileAccessMode]::Read))
$decoder = Await-WinRT([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream))
$bitmap = Await-WinRT($decoder.GetSoftwareBitmapAsync())

$lang = [Windows.Globalization.Language]::new('ko')
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
$result = Await-WinRT($engine.RecognizeAsync($bitmap))

Write-Output $result.Text
