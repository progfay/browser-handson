npm exec mkcert create-ca
npm exec mkcert create-cert
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./ca.crt
