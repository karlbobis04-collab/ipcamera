# Run this script as Administrator to allow port 8080 so you can open
# http://192.168.145.76:8080/ from other devices (phone, other PC).
# Right-click PowerShell -> Run as administrator, then:
#   cd "C:\Users\Donald\Downloads\rtsp-to-hls-node"
#   .\allow-firewall.ps1

$ruleName = "Node HLS 8080"
$existing = netsh advfirewall firewall show rule name=$ruleName 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Rule '$ruleName' already exists. Port 8080 should be allowed."
} else {
    netsh advfirewall firewall add rule name=$ruleName dir=in action=allow protocol=TCP localport=8080
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Firewall rule added. You can now open http://192.168.145.76:8080/ from other devices."
    } else {
        Write-Host "Failed. Make sure you ran PowerShell as Administrator."
    }
}
