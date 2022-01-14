# Development setup

## SVGedit redirects 

For API communication, SVGedit and FiglinQ must me on the same domain, so let's add some redirects in Windows to run SVGedit at http://svgedit.plotly.local/src/editor/ and FiglinQ at https://plotly.local.

### Windows/WSL

1. Add `127.65.43.21 svgedit.plotly.local` to C:\Windows\System32\drivers\etc\hosts
2. Open Windows command line (cmd) *as administrator*
3. Run the following command `netsh interface portproxy add v4tov4 listenport=80 listenaddress=127.65.43.21 connectport=8000 connectaddress=127.0.0.1` 

You can use a different local IP address if this one is taken.  

To verify run `netsh interface portproxy show v4tov4`

### Linux

1. Add `127.65.43.21 svgedit.plotly.local` to /etc/hosts
2. Run `sudo iptables -t nat -A OUTPUT -p tcp --dport 80 -d 127.65.43.21 -j DNAT --to-destination 127.0.0.1:8000`
