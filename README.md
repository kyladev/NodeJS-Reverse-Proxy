# NodeJS-Reverse-Proxy-8080-443
A basic NodeJS reverse proxy, designed for during hosting a proxy.

example usage (main server on port 8080, listening to the outside on 443):
```bash
HTTP_PORT=0 HTTPS_PORT=443 TARGET="http://127.0.0.1:8080" node index.js
```

REMEMBER TO CHANGE THE SSL CERTIFICATE PATHS IN INDEX.JS TO YOUR OWN!
