#!/bin/sh

cd "$(dirname "$0")"
echo 'ZVM'
python regtest.py -i "./zvm.js" praxix.z5.regtest
echo 'ZVM in RemGlk mode'
python regtest.py -i "./zvm.js --rem=1" -r praxix.z5.regtest
python regtest.py -i "./zvm.js --rem=1" -r advent.z5.regtest
rm adventtest