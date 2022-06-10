#!/bin/bash

# Copy ext-figlinq static files
cp ./src/editor/extensions/ext-figlinq/ext-figlinq.css ./dist/editor/extensions/ext-figlinq
cp -r ./src/editor/extensions/ext-figlinq/images ./dist/editor/extensions/ext-figlinq
cp ./src/editor/extensions/ext-figlinq/favicon.ico ./dist/editor
cp -r ./src/editor/components ./dist/editor

# Adjust hardcoded paths
sed -i 's#lib="./extensions/ext-shapes/shapelib/"#lib="/static/figedit/svgedit/dist/editor/extensions/ext-shapes/shapelib/"#' ./dist/editor/extensions/ext-shapes/ext-shapes.js
sed -i 's#url(./images/handle.svg)#url(/static/figedit/svgedit/dist/editor/extensions/ext-figlinq/images/handle.svg)#' ./dist/editor/components/seExplorerButton.js
sed -i 's#url(./images/handle.svg)#url(/static/figedit/svgedit/dist/editor/extensions/ext-figlinq/images/handle.svg)#' ./dist/editor/components/seFlyingButton.js
sed -i 's#./components/jgraduate/images/#/static/figedit/svgedit/dist/editor/components/jgraduate/images/#' ./dist/editor/components/seColorPicker.js
