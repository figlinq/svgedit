# Development setup

## SVGedit redirects 

For API communication, SVGedit and FiglinQ must me on the same domain, so let's add some redirects in Windows to run SVGedit at https://svgedit.plotly.local/src/editor/ and FiglinQ at https://plotly.local.

### Windows/WSL

1. Add `127.65.43.21 svgedit.plotly.local` to C:\Windows\System32\drivers\etc\hosts
2. Open Windows command line (cmd) *as administrator*
3. Run the following command (for http access) `netsh interface portproxy add v4tov4 listenport=80 listenaddress=127.65.43.21 connectport=8000 connectaddress=127.0.0.1` 
4. Run the following command (for https access) `netsh interface portproxy add v4tov4 listenport=443 listenaddress=127.65.43.21 connectport=8000 connectaddress=127.0.0.1` 
5. Install Chocolatey (https://chocolatey.org/install) by running 
   `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))` in PowerShell
6. Install mkcert by running `choco install mkcert` in PowerShell. 
7. Generate root certificates by running `mkcert -install`
8. Generate key and certificate files by running `mkcert -key-file key.pem -cert-file cert.pem plotly.local *.plotly.local`. Note the current directory - certificates will be saved there.
9. Add the following keys to exported object in file `web-dev-server.config.mjs`, in the main svg-edit directory:
   `http2: true,
    sslKey: "Path to key.pem",
    sslCert: "Path to cert.pem"`
 


You can use a different local IP address if this one is in use.  

To verify run `netsh interface portproxy show v4tov4`

### Linux

1. Add `127.65.43.21 svgedit.plotly.local` to /etc/hosts
2. Run `sudo iptables -t nat -A OUTPUT -p tcp --dport 80 -d 127.65.43.21 -j DNAT --to-destination 127.0.0.1:8000` (for http)
3. Run `sudo iptables -t nat -A OUTPUT -p tcp --dport 443 -d 127.65.43.21 -j DNAT --to-destination 127.0.0.1:8000` (for https)
4. Install and enable CORS Everywhere extension
