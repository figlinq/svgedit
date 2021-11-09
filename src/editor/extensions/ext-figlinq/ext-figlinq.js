import { folderItem, plotItem, imageItem, breadcrumb } from "./elements";
import { NS } from "./namespaces.js";
import { convertUnit, isValidUnit } from '../../../common/units.js';
/**
 * @file ext-figlinq.js
 * @license MIT
 * @copyright 2021 figlinq.com
 */

const name = "figlinq";
const baseUrl = location.hostname == "localhost" ? "https://plotly.local/" : "https://create.figlinq.com/";

export default {
  name,
  async init() {
    const svgEditor = this;
    const { svgCanvas } = svgEditor;
    
    return {
      name: svgEditor.i18next.t(`${name}:name`),
      callback() {
        document.querySelector('#se-cmenu_canvas').shadowRoot.querySelector('.contextMenu').setAttribute('style', 'min-width:250px;');

        jQuery(document).keydown(function(e){
          // Ctrl + z (undo)
          if ( e.originalEvent.ctrlKey && !e.originalEvent.shiftKey && e.originalEvent.keyCode == 90 ) {
            clickUndo();
          }
          // Ctrl + Shift + z (redo) 
          else if ( e.originalEvent.ctrlKey && e.originalEvent.shiftKey && e.originalEvent.keyCode == 90 ) {
            clickRedo();
          }
          // Ctrl + y (redo)
          else if( e.originalEvent.ctrlKey && e.originalEvent.keyCode == 89 ) {
            clickRedo();
          }
          else if( e.originalEvent.ctrlKey && e.originalEvent.keyCode == 89 ) {
            clickRedo();
          }
          // else if (e.originalEvent.ctrlKey==true && (e.originalEvent.which == '61' || e.originalEvent.which == '107' || e.originalEvent.which == '173' || e.originalEvent.which == '109'  || e.originalEvent.which == '187'  || e.originalEvent.which == '189'  ) ) {
          //   console.log("zoom1");
          //   e.preventDefault();
          //   e.stopPropagation();
          // }          
        });
        // jQuery(window).bind('mousewheel DOMMouseScroll', function (event) {
        //   if (event.ctrlKey == true) {
        //     console.log("zoom2");
        //     event.preventDefault();
        //     event.stopPropagation();
        //     return false;
        //   }
        // });
        
        // Initiate global vars
        var fqItemListFolder,
          fqItemListFile,
          fqUserId,
          fqUserData,
          fqCurrentFigData = false,
          fqModalMode,
          fqCsrfToken,        
          fqLastFolderId = false,
          fqExportDocType,
          fqExportDocQuality,
          fqExportDocSize,
          fqExportDocFname,
          fqExportMode,
          fqThumbWidth = 1000;
        const svgAttrWhitelist = ["class", "height", "width", "x", "y", "id"];
        const fqPdfPageSizes = {
          A0: "2383.94x3370.39",
          A1: "1683.78x2383.94",
          A2: "1190.55x1683.78",
          A3: "841.89x1190.55",
          A4: "595.28x841.89",
          A5: "419.53x595.28",
          Letter: "612.00x792.00",
        }
        const fqExportFileFormats = {
          "1x (current)": 1,
          "2x": 2,
          "3x": 3,
          "4x": 4,
          "8x": 8,
        }
        
        // To use this function we need to get content_type field into the "children" object returned from v2 
        // const getExt = (contentType) => {
        //   if (contentType == "image/jpeg" || contentType == "image/jpg") return "jpg";
        //   if (contentType == "image/svg" || contentType == "image/svg+xml") return "svg";
        //   if (contentType == "image/png") return "png";
        //   if (contentType == "image/bmp") return "bmp";
        //   if (contentType == "image/gif") return "gif";
        // }        

        // Replace the broken zoom functionality in v7
        const replaceZoom = () => {
          const element = `        
          <div id="zoom" class="select is-small" title="Hold shift while scrolling your mouse to zoom dynamically">
            <select>
              <option value="default">Zoom level</option>
              <option value="1000">1000</option>
              <option value="400">400</option>
              <option value="200">200</option>
              <option value="100">100</option>
              <option value="50">50</option>
              <option value="25">25</option>
              <option value="canvas">Fit to canvas</option>
              <option value="selection">Fit to selection</option>
              <option value="layer">Fit to content</option>
            </select>
          </div>`;
          jQuery("#zoom").replaceWith(element);
        };

        // Fitting to content does not work 
        // <option value="layer">Fit to layer content</option>
        // <option value="content">Fit to all content</option>

        const getFqUserId = () => {
          jQuery
          .ajax({
            url: baseUrl + "v2/users/current",
            xhrFields: {withCredentials: true}
          })
          .done(function(data) {
            if (data.username != "") {
              jQuery("#fq-menu-login-btn").addClass("is-hidden");
              jQuery("#fq-menu-signup-btn").addClass("is-hidden");
              jQuery(".fq-menu-add-content-btn").removeClass("is-hidden");
              jQuery("#fq-menu-interact-switch-item").removeClass("is-hidden");
              jQuery("#fq-menu-item-open-figure").removeClass("is-hidden");
              jQuery("#fq-menu-item-save-figure").removeClass("is-hidden");
              jQuery("#fq-menu-item-save-figure-as").removeClass("is-hidden");
              
              fqUserId = data.username;
              fqCsrfToken = data.csrf_token;
              fqUserData = data;
            }
          })
          .fail(function() {
            jQuery("#fq-menu-login-btn").removeClass("is-hidden");
            jQuery("#fq-menu-signup-btn").removeClass("is-hidden");
            jQuery(".fq-menu-add-content-btn").addClass("is-hidden");
            jQuery(".fq-menu-add-content-btn").addClass("is-hidden");
            jQuery(".fq-menu-add-content-btn").addClass("is-hidden");
            jQuery(".fq-menu-add-content-btn").addClass("is-hidden");
          });
        };

        const ensureElementLowercase = () => {
          
          var str = svgCanvas.getSvgString();
          
          if(str.includes("BODY")) {
            str = str.replaceAll("BODY", "body");
          }
          
          if(str.includes("IFRAME")) {
            str = str.replaceAll("IFRAME", "iframe");
          }          
          svgEditor.loadSvgString(str);
        };

        const setInteractiveOff = () => {

          const fObjects = jQuery("foreignObject[class='figlinq-fobject']");
          fObjects.each(function() {
            var url, height, width, x, y;

            url = jQuery(this)
              .find("iframe")
              .attr("src");
            url = url.replace(".embed", ".svg");
            height = jQuery(this).attr("height");
            width = jQuery(this).attr("width");
            x = jQuery(this).attr("x");
            y = jQuery(this).attr("y");

            const newImage = svgCanvas.addSVGElementFromJson({
              element: "image",
              attr: {
                x: x,
                y: y,
                width: width,
                height: height,
                id: svgCanvas.getNextId(),
                style: "pointer-events:inherit",
                class: "fq-content-element fq-plot"
              }
            });
            newImage.setAttributeNS(NS.XLINK, "xlink:href", url);
            this.replaceWith(newImage);
          });
          document.activeElement.blur();
        };

        const setInteractiveOn = () => {
          var currentUrl, src, height, width, x, y, newForeignObj, newElem;
          const plotImages = jQuery('.fq-content-element.fq-plot');
          
          plotImages.each(function(){
            currentUrl = jQuery(this).attr("xlink:href");
            src = currentUrl.replace(".svg", ".embed");
            height = jQuery(this).attr("height");
            width = jQuery(this).attr("width");
            x = jQuery(this).attr("x");
            y = jQuery(this).attr("y");

            newForeignObj = generateFObject(x, y, width, height, src);
            newElem = svgCanvas.addSVGElementFromJson(newForeignObj);
            this.replaceWith(newElem);
          });
          // Ugly hack to reload iframes, but it works!
          ensureElementLowercase();
        };

        const updateBreadcrumb = (fid, fname) => {
          var fidPresent = false;
          jQuery(".breadcrumb-item").each(function() {
            if (jQuery(this).data("fid") == fid) fidPresent = true;
          });

          if (fidPresent) {
            jQuery(
              jQuery(".breadcrumb-item")
                .get()
                .reverse()
            ).each(function(index) {
              if (jQuery(this).data("fid") == fid) {
                return false;
              } else {
                jQuery(this).remove();
              }
            });
          } else {
            jQuery(breadcrumb(fid, fname)).insertAfter(".breadcrumb-item:last");
          }
        };

        const getSortedElems = (selector, attrName) => {
          return jQuery(
            jQuery(selector)
              .toArray()
              .sort((a, b) => {
                var aVal = parseInt(a.getAttribute(attrName)),
                  bVal = parseInt(b.getAttribute(attrName));
                return aVal - bVal;
              })
          );
        };

        const getFileExt = (fname) => {
          var re = /(?:\.([^.]+))?$/;
          return re.exec(fname)[1];
        };

        const getUrlParameter = function getUrlParameter(sParam) {
          var sPageURL = window.location.search.substring(1),
              sURLVariables = sPageURL.split('&'),
              sParameterName,
              i;
      
          for (i = 0; i < sURLVariables.length; i++) {
              sParameterName = sURLVariables[i].split('=');
      
              if (sParameterName[0] === sParam) {
                  return typeof sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
              }
          }
          return false;
        };

        const loadFqFigure = () => {
          // Load figure from url
          var fid = getUrlParameter('fid');
          if(fid){
            openFigure({data: {fid: fid}});
          } 
        };

        const updateItemList = (fid, page) => {
          var url =
          baseUrl + "v2/folders/" +
            fqUserId +
            ":" +
            fid +
            "?page=" +
            page +
            "&filetype=plot&filetype=fold&filetype=external_image&order_by=filename";

          jQuery
            .ajax({
              url: url,
              xhrFields: {
                withCredentials: true
              }
            })
            .done(function(data) {
              jQuery("#fq-modal-files-btn-openfig").prop("disabled", true);
              jQuery("#fq-modal-save-confirm-btn").prop("disabled", true);
              var results = data.children.results;
              var index = 0;
              
              results.forEach(result => {
                const currentFid = result.fid.includes(":")
                  ? result.fid.substring(result.fid.indexOf(":") + 1)
                  : result.fid;

                const isSvg = getFileExt(result.filename) === "svg";
                const includeNonSvg = fqModalMode == "addContent";
                
                if (result.filetype === "fold" && !result.deleted) {
                  fqItemListFolder += folderItem(result.filename, currentFid);
                } else if ((includeNonSvg || isSvg) && result.filetype === "external_image" && !result.deleted) {
                  fqItemListFile += imageItem(result.filename, currentFid, index);
                  index += 1;
                } else if (includeNonSvg && result.filetype === "plot" && !result.deleted) {
                  fqItemListFile += plotItem(result.filename, currentFid, index);
                  index += 1;
                }
              });

              if (data.children.next == null) {
                jQuery(".panel-list-item").remove();
                jQuery("#fq-modal-item-list-container").html(
                  fqItemListFolder + fqItemListFile
                );
                // jQuery("#fq-modal-file").addClass("is-active");
                jQuery("#fq-modal-refresh-btn").removeClass("is-loading");
              } else {
                page = page + 1;
                updateItemList(fid, page);
              }
            })
            .fail(function() {
              showToast("Communication error, file list has not been updated", "is-danger");
            })
            .always(function() {});
        };

        const generateFObject = (x, y, width, height, src) => {
          let newIframe = {
            element: "iframe",
            attr: {
              x: x,
              y: y,
              width: width,
              height: height,
              id: svgCanvas.getNextId(),
              src: src
            }
          };

          let newBody = {
            element: "body",
            attr: {
              id: svgCanvas.getNextId(),
              xmlns: "http://www.w3.org/1999/xhtml"
            },
            children: [newIframe]
          };

          let newForeignObj = {
            element: "foreignObject",
            attr: {
              x: x,
              y: y,
              width: width,
              height: height,
              id: svgCanvas.getNextId(),
              class: "figlinq-fobject"
            },
            children: [newBody]
          };
          return newForeignObj;
        };

        const importImage = (url, width = "auto", height = "auto", x, y, selectedType) => {
          const newImage = svgCanvas.addSVGElementFromJson({
            element: "image",
            attr: {
              x: x,
              y: y,
              width: width,
              height: height,
              id: svgCanvas.getNextId(),
              style: "pointer-events:inherit",
              class: "fq-content-element" + " fq-" + selectedType,
            }
          });
          newImage.setAttributeNS(NS.XLINK, "xlink:href", url);
        };

        const getSvgFromEditor = () => {
          svgCanvas.clearSelection();
          const saveOpts = {
            images: svgEditor.configObj.pref("img_save"),
            round_digits: 6,
            apply: true,
          };
          const saveOptions = svgCanvas.mergeDeep(svgCanvas.getSvgOption(), saveOpts);
          for (const [ key, value ] of Object.entries(saveOptions)) {
            svgCanvas.setSvgOption(key, value);
          }
  
          const svg = '<?xml version="1.0"?>' + svgCanvas.svgCanvasToString();
          // const b64Data = svgCanvas.encode64(svg);
          // const blob = b64toBlob(b64Data, 'image/svg+xml');
          return svg;
        };

        const showToast = (msg, type) => {
          bulmaToast.toast({ 
            message: msg, 
            type: type, 
            position: 'bottom-right',
            closeOnClick: true,
            dismissible: true,
            duration: 3000,
          });
        };

        const ensureRulesGrids = () => {

          let showGrid = svgEditor.configObj.curConfig.showGrid;
          if(showGrid){
            jQuery("#fq-menu-show-grid").find("i").removeClass("fa-square").addClass("fa-check-square");
          } else {
            jQuery("#fq-menu-show-grid").find("i").addClass("fa-square").removeClass("fa-check-square");
          }

          let showRulers = svgEditor.configObj.curConfig.showRulers;
          if(showRulers){
            jQuery("#fq-menu-show-rulers").find("i").removeClass("fa-square").addClass("fa-check-square");
          } else {
            jQuery("#fq-menu-show-rulers").find("i").addClass("fa-square").removeClass("fa-check-square");
          }
        };

        const refreshModalContents = () => {

          fqItemListFolder = "";
          fqItemListFile = "";
          jQuery("#fq-modal-file").addClass("is-active");
          if (fqLastFolderId) {
            updateItemList(fqLastFolderId, 1);
          } else {
            var fid = "-1";
            fqLastFolderId = fid;
            updateItemList(fid, 1);
          }
        };

        const decodeBase64 = function(s) {
            var e={},i,b=0,c,x,l=0,a,r='',w=String.fromCharCode,L=s.length;
            var A="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            for(i=0;i<64;i++){e[A.charAt(i)]=i;}
            for(x=0;x<L;x++){
                c=e[s.charAt(x)];b=(b<<6)+c;l+=6;
                while(l>=8){((a=(b>>>(l-=8))&0xff)||(x<(L-2)))&&(r+=w(a));}
            }
            return r;
        };

        const clickUndo = function() {
          const { undoMgr, textActions } = svgCanvas;
          if (undoMgr.getUndoStackSize() > 0) {
            undoMgr.undo();
            svgEditor.layersPanel.populateLayers();
            if (svgEditor.svgCanvas.getMode() === 'textedit') {
              textActions.clear();
            }
          }
        }

        const clickRedo = function() {
          const { undoMgr } = svgCanvas;
          if (undoMgr.getRedoStackSize() > 0) {
            undoMgr.redo();
            svgEditor.layersPanel.populateLayers();
          }
        }

        const onConfirmClear = async function () {
          jQuery("#fq-modal-confirm").removeClass("is-active");
          
          // Remove fid from url
          var currentUrl = new URL(document.location);
          currentUrl.searchParams.delete("fid");
          window.history.pushState(null, null, currentUrl.href);

          fqCurrentFigData = false;
          jQuery("#fq-menu-item-save-figure").addClass("is-disabled");

          const [ x, y ] = svgEditor.configObj.curConfig.dimensions;
          svgEditor.leftPanel.clickSelect();
          svgEditor.svgCanvas.clear();
          svgEditor.svgCanvas.setResolution(x, y);
          svgEditor.updateCanvas(true);
          svgEditor.zoomImage();
          svgEditor.layersPanel.populateLayers();
          svgEditor.topPanel.updateContextPanel();
          svgEditor.svgCanvas.runExtensions("onNewDocument");
          setTimeout(function(){ svgEditor.zoomChanged(window, "canvas"); }, 300);
        };
    
        const openFigure = async function(e) {
          
          var url = baseUrl + "v2/external-images/" + e.data.fid;

          jQuery.ajax({
            url: url,
            xhrFields: {withCredentials: true},
          })
          .done(function(data) {
            if(!"image_content" in data || 
            (data.content_type != "image/svg" && data.content_type != "image/svg+xml")
            ) {
              showToast('This file type is not supported', 'is-danger');
              return;
            }

            var dataUrl = data.image_content;
            var svgString = decodeBase64(dataUrl.split(",")[1]);
            svgEditor.loadSvgString(svgString);
            jQuery("#fq-modal-confirm").removeClass("is-active");
            fqCurrentFigData = data;
            setTimeout(function(){ svgEditor.zoomChanged(window, "canvas"); }, 250);
            showToast('File "' + data.filename + '" loaded', 'is-success');

            // Add fid to url
            var currentUrl = new URL(document.location);
            currentUrl.searchParams.set("fid", data.fid);
            window.history.pushState(null, null, decodeURIComponent(currentUrl.href));

            jQuery("#fq-menu-item-save-figure").removeClass("is-disabled");
          })
          .fail(function(data) {
            showToast('This file could not be loaded', 'is-danger');
          });
        };

        const inlineRasterImage = async function(imgId) {
          var imgUrl = jQuery("#" + imgId).attr("xlink:href");
          
          let fetchResult = await fetch(imgUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: {
              'X-CSRFToken': fqCsrfToken,
            }
          })
          .then( 
            async (r) => {
              const blob = await r.blob();
              const type = r.headers.get("Content-Type");
              return {blob, type};
            } 
          );

          let dataUrl = await new Promise(resolve => {
            let reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(fetchResult.blob);
          });
          jQuery('#'+imgId).attr("xlink:href", dataUrl);
        };

        const inlineSvgImage = async function(imgId) {
          var imgUrl = jQuery("#fq-svg-container").find('#'+imgId).attr("xlink:href");
          
          await fetch(imgUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
          })
          .then(result => result.text())
          .then(text => {
            var replacedObj = jQuery( "#fq-svg-container" ).find('#'+imgId);
            var doc = new DOMParser().parseFromString(text, 'application/xml');
            var newObj = jQuery(doc.documentElement).replaceAll( replacedObj );

            jQuery(newObj).attr( "id", imgId );
          });
        };

        const svgToRaster = (svgString) => {
          return new Promise(resolve => {
            const canvas = document.getElementById('fq-canvas');
            const resolution = svgCanvas.getResolution();
            var w, h;
            if (fqExportMode === "thumb"){
              w = fqThumbWidth;
              h = Math.round(resolution.h * fqThumbWidth / resolution.w);
            } else {
              w = resolution.w * parseInt(fqExportDocSize);
              h = resolution.h * parseInt(fqExportDocSize);
            }
            
            canvas.width = w;
            canvas.height = h;            
            var blob = new Blob([svgString], { type: 'image/svg+xml' });          
            var win = window.URL || window.webkitURL || window;
            var img = new Image();            
            var url = win.createObjectURL(blob);

            img.onload = function () {              
              const ctx = canvas.getContext('2d');
              
              if (fqExportDocType != "png") {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, w, h);
              }
              ctx.drawImage(img, 0, 0, w, h);            
              win.revokeObjectURL(url);
              // If saving image/thumbnail to FiglinQ, return blob so that it can be added to form
              if (fqExportMode === "thumb"){
                canvas.toBlob(function(blob) {resolve(blob)});
                return;
              }
              else if (fqExportMode === "download"){
                var uri = canvas.toDataURL('image/' + fqExportDocType, fqExportDocQuality).replace('image/' + fqExportDocType, 'octet/stream');
              }
              
              // Add link to download file
              var a = document.createElement('a');
              document.body.appendChild(a);
              a.style = 'display: none';
              a.href = uri
              a.download = fqExportDocFname + '.' + fqExportDocType;
              a.click();
              window.URL.revokeObjectURL(uri);
              document.body.removeChild(a);
            };

            img.src = url;
          });
        }

        const svgToPdf = (svgString) => {
          const docDimsStr = jQuery("#fq-modal-export-size-select").val();
          const docDims = docDimsStr.split("x");

          const doc = new PDFDocument({size: fqExportDocSize});

          const chunks = [];
          doc.pipe({
            // writable stream implementation
            write: (chunk) => chunks.push(chunk),            
            end: () => {
              const pdfBlob = new Blob(chunks, {
                type: 'application/octet-stream'
              });
              var blobUrl = window.URL.createObjectURL(pdfBlob);
              
              var a = document.createElement('a');
              document.body.appendChild(a);
              a.style = 'display: none';
              a.href = blobUrl
              a.download = fqExportDocFname + '.pdf';
              a.click();
              window.URL.revokeObjectURL(blobUrl);
              document.body.removeChild(a);
            },
            // readable stream stub iplementation
            on: (event, action) => {},
            once: (...args) => {},
            emit: (...args) => {},
          });
          SVGtoPDF(doc, svgString, 0, 0, {width: docDims[0], height: docDims[1], preserveAspectRatio: "xMinYMin meet"});
          doc.end();
        };
        
        const inlineRasterImageLoop = async function(imgIdArray) {
          for (const imgId of imgIdArray) {
            await inlineRasterImage(imgId);
          }
        };

        const inlineSvgImageLoop = async function(imgIdArray) {
          for (const imgId of imgIdArray) {
            await inlineSvgImage(imgId);
          }
        };

        const updateExportFormSizeSelect = (options) => {
          jQuery('#fq-modal-export-size-select').find('option').remove();

          jQuery.each(options, function(key, value) {
            jQuery('#fq-modal-export-size-select')
              .append(jQuery("<option></option>")
              .attr("value", value)
              .text(key));
          });
      }

        const updateExportFormState = () => {
          let format = jQuery("#fq-modal-export-format-select").val();
          if (format === "jpeg") {
            jQuery('[id^="fq-modal-export-quality"]').prop( "disabled", false );
            jQuery('[id^="fq-modal-export-size"]').prop( "disabled", false );
            updateExportFormSizeSelect(fqExportFileFormats);
            jQuery('#fq-modal-export-size-select').val(1);
          } else if (format === "png" || format === "bmp"){
            jQuery('[id^="fq-modal-export-quality"]').prop( "disabled", true );
            updateExportFormSizeSelect(fqExportFileFormats);
            jQuery('#fq-modal-export-size-select').val(1);
          } else {
            jQuery('[id^="fq-modal-export-quality"]').prop( "disabled", true );            
            updateExportFormSizeSelect(fqPdfPageSizes);
            jQuery('#fq-modal-export-size-select').val(fqPdfPageSizes["A4"]);
          }
        }

        const getAttributes = ( $node ) => {
          var attrs = {};
          jQuery.each( $node[0].attributes, function ( index, attribute ) {
              attrs[attribute.name] = attribute.value;
          } );      
          return attrs;
        }

        const exportImageFromEditor = async () => {
          // Empty temp div
          // jQuery("#fq-svg-container").empty();

          // Clone SVG into temp div
          
          var svgString = svgCanvas.svgCanvasToString();
          
          var doc = new DOMParser().parseFromString(svgString, 'application/xml');
          jQuery("#fq-svg-container").append(doc.documentElement);

          // Inline raster images and plots
          var fqElements = jQuery("#fq-svg-container").find(".fq-content-element"),
          imageIdArray = [],
          plotIdArray = [],
          attrArray = {},
          curId, newId;

          if (fqElements.length) {
            jQuery( fqElements ).each(function() {
              curId = jQuery(this).attr('id');
              newId = "__" + curId;
              jQuery(this).attr('id', newId);

              attrArray[newId] = getAttributes(jQuery(this));

              if (jQuery(this).hasClass("fq-image")) {                
                imageIdArray.push(newId);
              } else if (jQuery(this).hasClass("fq-plot")) {
                plotIdArray.push(newId);
              }
            });

            if (imageIdArray.length) await inlineRasterImageLoop(imageIdArray);
            if (plotIdArray.length) await inlineSvgImageLoop(plotIdArray);

            var curAttrObj; 
            for (const curId in attrArray) {
              var isImage = jQuery("#" + curId).hasClass("fq-image");
              curAttrObj = attrArray[curId];
              for (const curAttr in curAttrObj) {
                if (!(curAttr == "xlink:href" && isImage)) {
                  jQuery("#" + curId).attr(curAttr, curAttrObj[curAttr]);
                }
              }             
            }
            // Remove non-whitelisted attributes
            // if( jQuery.inArray(key, svgAttrWhitelist) == -1 ) {
            //   jQuery("#fq-svg-container").find("#" + info.id).removeAttr(key);
            // }
          }

          // Get the svg string
          var el = document.getElementById("fq-svg-container");
          var svgEl = el.firstChild;
          var serializer = new XMLSerializer();
          var svgStr = serializer.serializeToString(svgEl);
          jQuery("#fq-svg-container").empty();

          // Create image
          if (fqExportDocType === "pdf") {
            svgToPdf(svgStr);
          } else {
            if (fqExportMode === "download") {
              svgToRaster(svgStr);        
            } 
            else if (fqExportMode === "thumb"){
              var blob = await svgToRaster(svgStr);
              return blob;
            }
          }
        }

        const uploadFileToFiglinQ = (formData, apiEndpoint, world_readable) => {
          jQuery.ajax({
            method: "POST",
            url: baseUrl + "v2/external-images/" + apiEndpoint,
            xhrFields: {
              withCredentials: true
            },
            headers: {
              'X-File-Name': fqExportDocFname + ".svg",
              'Plotly-World-Readable': world_readable,
              'Plotly-Parent': fqLastFolderId,
              'X-CSRFToken': fqCsrfToken,
            },
            data: formData,
            processData: false,
            contentType: false,
          })
          .done(function(response) {
            jQuery("#fq-modal-refresh-btn").addClass("is-loading");
            fqItemListFolder = "";
            fqItemListFile = "";
            updateItemList(fqLastFolderId, 1);
            jQuery("#fq-modal-file").removeClass("is-active");
            
            showToast("File " + response.file.filename + " saved", "is-success");
            
            var currentUrl = new URL(document.location);
            currentUrl.searchParams.set("fid", response.file.fid);
            window.history.pushState(null, null, decodeURIComponent(currentUrl.href));
            
            fqCurrentFigData = response.file;
            jQuery("#fq-menu-item-save-figure").removeClass("is-disabled");

            })
          .fail(function() {
            showToast("Error - file was not saved", "is-danger");
          });
        }

        jQuery(document).on("change", "#fq-modal-export-format-select", () => {
          updateExportFormState();
        });

        jQuery(document).on("change", "#fq-doc-baseunit", (e) => {
          let baseUnit = jQuery(e.target).val();
          var w = jQuery("#fq-doc-setup-width").val();
          var h = jQuery("#fq-doc-setup-height").val();

          svgEditor.configObj.curConfig.baseUnit = baseUnit;
          svgCanvas.setConfig(svgEditor.configObj.curConfig);
          svgEditor.updateCanvas();
          const resolution = svgEditor.svgCanvas.getResolution();
          w = convertUnit(resolution.w) + baseUnit;
          h = convertUnit(resolution.h) + baseUnit;

          // Update inputs
          jQuery("#fq-doc-setup-width").val(w);
          jQuery("#fq-doc-setup-height").val(h);
        });

        jQuery(document).on("change", "#fq-doc-size", (e) => {
          var w, h, val = jQuery(e.target).val();          
          if(val){
            const dims = val.split("x");
            w = dims[0];
            h = w === 'fit' ? 'fit' : dims[1];
            // const resolution = svgEditor.svgCanvas.getResolution();
            if (svgEditor.configObj.curConfig.baseUnit !== "px") {
              w = convertUnit(w) + svgEditor.configObj.curConfig.baseUnit;
              h = convertUnit(h) + svgEditor.configObj.curConfig.baseUnit;
            }

            w = w === 'fit' ? 'Fit contents' : w;
            h = h === 'fit' ? 'Fit contents' : h;

            jQuery("#fq-doc-setup-width").val(w);
            jQuery("#fq-doc-setup-height").val(h);
          }
        });

        jQuery(document).on("click", "#fq-menu-file-item-export", () => {          
          jQuery("#fq-modal-export").addClass("is-active");
        });

        jQuery(document).on("click", ".fq-modal-export-quality", (e) => {
          const incr = parseInt(jQuery(e.target).data("increment"));
          var value = parseInt(jQuery("#fq-modal-export-quality-input").val());
          var newValue = value + incr;
          if (newValue > 100) newValue = 100;                      
          if (newValue < 10) newValue = 10;
          jQuery("#fq-modal-export-quality-input").val(newValue);
        });
        
        jQuery(document).on("click", "#fq-modal-export-btn-export", async () => {

          fqExportMode = "download";
          fqExportDocType = jQuery("#fq-modal-export-format-select").val();
          fqExportDocQuality = parseFloat(jQuery("#fq-modal-export-quality-input").val()) / 100;
          fqExportDocFname = jQuery("#fq-modal-export-fname-input").val();
          if (fqExportDocType == "pdf") {
            fqExportDocSize = jQuery("#fq-modal-export-size-select option:selected").text();
          } else {
            fqExportDocSize = parseInt(jQuery("#fq-modal-export-size-select").val());            
          }
          
          await exportImageFromEditor();

        });

        jQuery(document).on("focusout", "#fq-modal-export-quality-input", (e) => {
          var newValue = parseInt(jQuery(e.target).val());
          if (newValue > 100) newValue = 100;            
          if (newValue < 10) newValue = 10;
          if (isNaN(newValue)) newValue = 80;
          jQuery(e.target).val(newValue);
        });

        jQuery(document).on("click", "#fq-menu-show-grid", () => {
          jQuery("#view_grid").click();
          let showGrid = svgEditor.configObj.curConfig.showGrid;
          if(showGrid){
            jQuery("#fq-menu-show-grid").find("i").removeClass("fa-square").addClass("fa-check-square");
          } else {
            jQuery("#fq-menu-show-grid").find("i").addClass("fa-square").removeClass("fa-check-square");
          }
        });
        
        jQuery(document).on("click", "#fq-menu-show-rulers", () => {
          let showRulers = svgEditor.configObj.curConfig.showRulers;
          if(!showRulers){
            jQuery("#fq-menu-show-rulers").find("i").removeClass("fa-square").addClass("fa-check-square");
          } else {
            jQuery("#fq-menu-show-rulers").find("i").addClass("fa-square").removeClass("fa-check-square");
          }
          svgEditor.configObj.curConfig.showRulers = !showRulers;
          svgEditor.rulers.display(!showRulers);
        });

        jQuery(document).on("click", "#fq-menu-item-doc-properties", () => {
          jQuery("#fq-doc-size").val("");
          const resolution = svgEditor.svgCanvas.getResolution();
          if (svgEditor.configObj.curConfig.baseUnit !== "px") {
            resolution.w =
            convertUnit(resolution.w) + svgEditor.configObj.curConfig.baseUnit;
            resolution.h =
            convertUnit(resolution.h) + svgEditor.configObj.curConfig.baseUnit;
          }

          const baseunit = svgEditor.configObj.curConfig.baseUnit;
          jQuery("#fq-doc-baseunit").val(baseunit);

          const gridSnappingOn = svgEditor.configObj.curConfig.gridSnapping;
          const gridSnappingStep = svgEditor.configObj.curConfig.snappingStep;

          jQuery("#fq-doc-setup-snapping-enabled").prop('checked', gridSnappingOn);
          jQuery("#fq-doc-setup-snapping-step").val(gridSnappingStep);

          jQuery("#fq-doc-setup-width").val(resolution.w);
          jQuery("#fq-doc-setup-height").val(resolution.h);
          jQuery("#fq-modal-doc-setup").addClass("is-active");
          
        });
        
        jQuery(document).on("click", "#fq-doc-setup-save-btn", () => {
          const predefined = jQuery("#fq-doc-size").val();
          const gridSnappingStep = parseInt(jQuery("#fq-doc-setup-snapping-step").val());
          const gridSnappingOn = jQuery("#fq-doc-setup-snapping-enabled").prop("checked");

          const w = predefined === 'fit' ? 'fit' : jQuery("#fq-doc-setup-width").val();
          const h = predefined === 'fit' ? 'fit' : jQuery("#fq-doc-setup-height").val();
          const baseunit = jQuery("#fq-doc-baseunit").val();
          jQuery("#fq-modal-doc-setup").removeClass("is-active");
          
          
          if (w !== 'fit' && !isValidUnit('width', w)) {
            showToast('Invalid width unit!', 'is-danger');
            return;
          }
          if (h !== 'fit' && !isValidUnit('height', h)) {
            showToast('Invalid height unit!', 'is-danger');
            return;
          }
          
          if (!svgCanvas.setResolution(w, h)) {
            showToast('No content to fit!', 'is-danger');
          }
          
          svgEditor.configObj.curConfig.baseUnit = baseunit;
          svgEditor.configObj.curConfig.gridSnapping = gridSnappingOn;
          svgEditor.configObj.curConfig.snappingStep = gridSnappingStep;

          svgCanvas.setConfig(svgEditor.configObj.curConfig);
          svgEditor.updateCanvas();
                      
        });
    
        jQuery(document).on("click", ".fq-modal-cancel-btn", () => {
          jQuery(".modal").removeClass("is-active");
        });

        jQuery(document).on("click", "#fq-modal-refresh-btn", () => {
          refreshModalContents();
        });

        jQuery(document).on("click", ".fq-modal-plot-item, .fq-modal-image-item", e => {

          if(fqModalMode === "saveFigure"){
            if(jQuery(e.target).hasClass("fq-modal-image-item")){
              jQuery(".fq-modal-plot-item, .fq-modal-image-item").removeClass("is-active");
              jQuery(e.target).addClass("is-active");
              var text = jQuery(e.target).find(".fq-list-item-text").html();
              text = text.replace(/\.[^/.]+$/, "");
              jQuery("#fq-modal-save-name-input").val(text);
              jQuery("#fq-modal-save-confirm-btn").prop("disabled", false);
            }
            return
          }

          if(fqModalMode === "openFigure"){
            jQuery(".fq-modal-plot-item, .fq-modal-image-item").removeClass("is-active");
            jQuery(e.target).addClass("is-active");
            jQuery("#fq-modal-files-btn-openfig").prop("disabled", false);
            return
          }

          if (jQuery(e.target).hasClass("is-active")) {
            jQuery(e.target).removeClass("is-active");
          } else {
            jQuery(e.target).addClass("is-active");
          }

          var activePresent = false;
          var activeList = [];
          jQuery(".fq-modal-plot-item, .fq-modal-image-item").each(function() {
            if (jQuery(this).hasClass("is-active")) {
              activePresent = true;
              activeList.push(jQuery(this).data("fid"));
            }
          });

          if (activePresent) {
            jQuery("#fq-modal-add-confirm-btn").prop("disabled", false);
            jQuery("#fq-modal-add-confirm-btn").data("selectedFid", activeList);
            if (activeList.length > 1) {
              jQuery("#col_select").prop("disabled", false);
            } else {
              jQuery("#col_select").prop("disabled", true);
            }
          } else {
            jQuery("#fq-modal-add-confirm-btn").prop("disabled", true);
          }
        });

        jQuery(document).on("click", ".fq-modal-folder-item", e => {
          const dataFid = jQuery(e.currentTarget)
            .data("fid")
            .toString();
          const fid = dataFid.includes(":")
            ? dataFid.substring(dataFid.indexOf(":") + 1)
            : dataFid;
          const fname = jQuery(e.target)
            .text()
            .trim();
            
          fqLastFolderId = fid;

          updateBreadcrumb(fid, fname);

          fqItemListFolder = "";
          fqItemListFile = "";
          updateItemList(fid, 1);
          jQuery("#fq-modal-add-confirm-btn").prop("disabled", true);
          jQuery("#fq-modal-refresh-btn").addClass("is-loading");
        });
    
        jQuery(document).on("click", "#fq-menu-interact-switch", () => {
          var checked = jQuery("#fq-menu-interact-switch").is(":checked");
          if (checked) {
            setInteractiveOn();
          } else {
            setInteractiveOff();
          }
        });

        jQuery(document).on("click", "#fq-modal-add-confirm-btn", e => {          
       
          jQuery(e.target).addClass("is-loading");
          const selector = ".fq-modal-plot-item.is-active, .fq-modal-image-item.is-active";
          const selectedItems = getSortedElems(selector, "data-index");
          var x = 0,
            y = 0,
            colNumber = jQuery("#col_select").val(),
            curCol = 1,
            selectedFid, ext;

          jQuery.each(selectedItems, index => {
            
            selectedFid = jQuery(selectedItems[index]).data("fid");
            var selectedType = jQuery(selectedItems[index]).data("ftype");

            var imgDataUrl =
              baseUrl + "v2/plots/" +
              fqUserId +
              ":" +
              selectedFid;
            
            ext = selectedType === "plot" ? ".svg" : ".src";

            const importUrl = 
              baseUrl + "~" +
              fqUserId +
              "/" +
              selectedFid + ext;

            if (selectedType === "plot"){
              jQuery
                .ajax({
                  url: imgDataUrl,
                  xhrFields: {
                    withCredentials: true
                  }
                })
                .done(function(data) {
                  var width = data.figure.layout.width
                    ? data.figure.layout.width
                    : 400;
                  var height = data.figure.layout.height
                    ? data.figure.layout.height
                    : 400;

                  importImage(importUrl, width, height, x, y, selectedType);
                  x += width;
                  curCol += 1;
                  if (curCol > colNumber) {
                    curCol = 1;
                    y += height;
                    x = 0;
                  }
                  jQuery(e.target).removeClass("is-loading");
                  jQuery("#fq-modal-file").removeClass("is-active");
                  setTimeout(function(){ svgEditor.zoomChanged(window, "layer"); }, 300);
                })
            } else if (selectedType === "image"){
              // Add width and height fields in v2
              const img = new Image();
              img.onload = function() {
                // alert(this.width + 'x' + this.height);
                importImage(importUrl, this.width, this.height, x, y, selectedType);
                x += 600;
                curCol += 1;
                if (curCol > colNumber) {
                  curCol = 1;
                  y += 400;
                  x = 0;
                }
              }
              img.src = importUrl;
              
              jQuery(e.target).removeClass("is-loading");
              jQuery("#fq-modal-file").removeClass("is-active");
              setTimeout(function(){ svgEditor.zoomChanged(window, "layer"); }, 300);              
            }
          });
        });

        jQuery(document).on("keyup", "#fq-modal-save-name-input", (e) => {
          let val = jQuery(e.target).val();
          
          if(val.length) {
            jQuery("#fq-modal-save-confirm-btn").prop("disabled", false);
          } else {
            jQuery("#fq-modal-save-confirm-btn").prop("disabled", true);
          }
        });

        jQuery(document).on("click", "#fq-modal-files-btn-openfig", () => {
          jQuery("#fq-modal-file").removeClass("is-active");
          jQuery("#fq-modal-confirm-btn-ok").html("Open figure");
          jQuery("#fq-modal-confirm").addClass("is-active");
          let fid = jQuery(".fq-modal-image-item.is-active").data("fid");

          jQuery("#fq-modal-confirm-btn-ok").prop("onclick", null).off("click");
          jQuery("#fq-modal-confirm-btn-ok").on("click", {fid: fqUserId + ":" + fid}, openFigure);
        });

        jQuery(document).on("click", "#fq-menu-file-item-newfig", () => {
          jQuery("#fq-modal-confirm-btn-ok").html("New figure");
          jQuery("#fq-modal-confirm").addClass("is-active");
          jQuery("#fq-modal-confirm-btn-ok").on("click", onConfirmClear);
        });

        jQuery(document).on("click", "#fq-modal-save-confirm-btn", async () => {
          
          fqExportMode = "thumb";
          fqExportDocType = "png";
          fqExportDocFname = jQuery("#fq-modal-save-name-input").val();
          fqExportDocSize = parseInt(jQuery("#fq-modal-export-size-select").val());            

          const world_readable = jQuery("#world_readable").val();
          
          // Check if file name exists
          var replacedFid, nameExists = false;
          jQuery(".fq-modal-image-item").each(function() {
            if(jQuery(this).find(".fq-list-item-text").html() == fqExportDocFname + ".svg") {
              nameExists = true;
              replacedFid = fqUserId + ":" + jQuery(this).data('fid');
            }
          });

          if(nameExists){
            if(!confirm("File already exists. Overwrite?")) return;
          }
          
          const svg = getSvgFromEditor();
          const apiEndpoint = nameExists ? 'replace' : 'upload';

          var imageBlob = new Blob([svg], {type:'image/svg+xml'});
          var imageFile = new File([imageBlob], fqExportDocFname + ".svg");
          
          var thumbBlob = await exportImageFromEditor();
          var thumbFile = new File([thumbBlob], fqExportDocFname + "_thumb.svg");

          var formData = new FormData();

          formData.append("files", imageFile);
          formData.append("thumb", thumbFile);

          if(nameExists) formData.append("replaced_fid", replacedFid);

          uploadFileToFiglinQ(formData, apiEndpoint, world_readable);

        });

        jQuery(document).on("change", "#zoom", (e) => {
          const value = jQuery(e.target).val();
          switch (value) {
            case 'default':
              return;
            case 'canvas':
            case 'selection':
            case 'layer':
            case 'content':
              svgEditor.zoomChanged(window, value);
              break;
            default:
            {
              const zoomlevel = Number(value) / 100;
              if (zoomlevel < 0.001) {
                value = 0.1;
                return;
              }
              const zoom = svgCanvas.getZoom();
              const { workarea } = svgEditor;
              svgEditor.zoomChanged(window, {
                width: 0,
                height: 0,
                // center pt of scroll position
                x: (workarea.scrollLeft + parseFloat(getComputedStyle(workarea, null).width.replace("px", "")) / 2) / zoom,
                y: (workarea.scrollTop + parseFloat(getComputedStyle(workarea, null).height.replace("px", "")) / 2) / zoom,
                zoom: zoomlevel
              }, true);
            }
          }
          jQuery(e.target).val("default");
        });

        jQuery(document).on("click", ".fq-menu-add-content-btn", () => {
          var checked = jQuery("#fq-menu-interact-switch").is(":checked");
          if(checked) jQuery("#fq-menu-interact-switch").click();

          jQuery(".modal-action-panel").addClass("is-hidden");
          jQuery(".content-add-panel").removeClass("is-hidden");
          jQuery("#file-panel-heading").html("Select content");

          fqModalMode = "addContent";
          refreshModalContents();

        });

        jQuery(document).on("click", "#fq-menu-item-save-figure", async () => {

          if(!fqCurrentFigData){
            showToast("Error - figure data could not be found", "is-danger");
            return;
          }
          
          fqExportMode = "thumb";
          fqExportDocType = "png";
          fqExportDocFname = fqCurrentFigData.filename;
          fqLastFolderId = fqCurrentFigData.parent;
          const world_readable = fqCurrentFigData.world_readable;
          const replacedFid = fqCurrentFigData.fid;
          
          const svg = getSvgFromEditor();
          const apiEndpoint = 'replace';

          const imageBlob = new Blob([svg], {type:'image/svg+xml'});
          const imageFile = new File([imageBlob], fqExportDocFname + ".svg");
          
          const thumbBlob = await exportImageFromEditor();
          const thumbFile = new File([thumbBlob], fqExportDocFname + "_thumb.svg");

          var formData = new FormData();

          formData.append("files", imageFile);
          formData.append("thumb", thumbFile);
          formData.append("replaced_fid", replacedFid);

          uploadFileToFiglinQ(formData, apiEndpoint, world_readable);
        })

        jQuery(document).on("click", "#fq-menu-item-save-figure-as", () => {
         
          jQuery(".modal-action-panel").addClass("is-hidden");
          jQuery("#file-panel-heading").html("Save figure");
          jQuery(".file-save-panel").removeClass("is-hidden");

          jQuery("#fq-modal-file").addClass("is-active");
          jQuery("#fq-modal-save-confirm-btn").prop("disabled", true);
          jQuery("#fq-modal-save-name-input").val("");

          fqModalMode = "saveFigure";
          refreshModalContents();

        });

        jQuery(document).on("click", "#fq-menu-item-open-figure", () => {
         
          jQuery(".modal-action-panel").addClass("is-hidden");
          jQuery("#file-panel-heading").html("Open figure");
          jQuery(".figure-open-panel").removeClass("is-hidden");

          jQuery("#fq-modal-file").addClass("is-active");
          jQuery("#fq-modal-files-btn-openfig").prop("disabled", true);

          fqModalMode = "openFigure";
          refreshModalContents();

        });

        // Init
        jQuery("#fq-menu-interact-switch").prop( "checked", false );
        ensureElementLowercase();
        ensureRulesGrids();
        getFqUserId(); 
        setInteractiveOff();
        replaceZoom();
        loadFqFigure();
        updateExportFormState();
      },
    };
  }
};
