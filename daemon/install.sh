#!/bin/bash

echo "Geo-Run Daemon Root Installation Script"

# Create necessary directories
sudo mkdir -p /Applications/geo-run/daemon
sudo mkdir -p /var/log/geo-run

# Copy daemon files
sudo cp -r ./dist /Applications/geo-run/daemon/
sudo cp -r ./node_modules /Applications/geo-run/daemon/node_modules/
sudo cp -r ./config.json /Applications/geo-run/daemon/
sudo cp -r ./scripts /Applications/geo-run/daemon/
sudo cp -r ./.env /Applications/geo-run/daemon/

# Set permissions
sudo chown -R root:wheel /Applications/geo-run
sudo chmod -R 755 /Applications/geo-run
sudo chown root:wheel /var/log/geo-run
sudo chmod 755 /var/log/geo-run

# Copy and load the LaunchDaemon
sudo cp com.geo-run.daemon.plist /Library/LaunchDaemons/
sudo chown root:wheel /Library/LaunchDaemons/com.geo-run.daemon.plist
sudo chmod 644 /Library/LaunchDaemons/com.geo-run.daemon.plist

# Load the LaunchDaemon
sudo launchctl load /Library/LaunchDaemons/com.geo-run.daemon.plist

echo "Installation complete. The daemon will now start automatically at system boot."
echo "You can check the logs at /var/log/geo-run/daemon.log and daemon.err"
