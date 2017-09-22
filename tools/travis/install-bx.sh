#!/usr/bin/env bash

wget https://public.dhe.ibm.com/cloud/bluemix/cli/bluemix-cli/latest/Bluemix_CLI_amd64.tar.gz && \
tar zxvf Bluemix_CLI_amd64.tar.gz && \
cd Bluemix_CLI && \
sudo ./install_bluemix_cli
