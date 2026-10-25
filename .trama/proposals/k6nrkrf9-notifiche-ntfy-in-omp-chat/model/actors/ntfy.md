# ntfy

The ntfy server that receives Trama's notifications and delivers them to the developer's phone or other devices: the public ntfy.sh or a server of the developer's own, the one named in the settings.

## Events

### DELIVERY_SUCCEEDED
The server accepted the notification.

### DELIVERY_FAILED
The server did not accept the notification: it could not be reached, it answered with an error, it refused the access token, it sent the request elsewhere, or it did not answer in time.
