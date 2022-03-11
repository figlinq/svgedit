import { folderItem, plotItem, imageItem, figureItem, breadcrumb } from "./elements";
import { NS } from "./namespaces.js";
import { isValidUnit } from '../../../common/units.js';
import * as hstry from '../../../svgcanvas/history';

const {
  InsertElementCommand, BatchCommand, UndoManager
} = hstry;

/**
 * @file ext-figlinq.js
 * @license MIT
 * @copyright 2021 figlinq.com
 */

const name = "figlinq";
const baseUrl = location.hostname == "svgedit.plotly.local" ? "https://plotly.local/" : "https://" + location.hostname + "/";

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
        });

        jQuery(window).bind('mousewheel DOMMouseScroll', function(event) {
            if(event.ctrlKey == true){
              event.preventDefault();
              showZoomWarning();
              return false;
            }
        });

        jQuery(".modal").bind('mousewheel DOMMouseScroll', function(event) {
            if(event.ctrlKey == true){
              event.preventDefault();
              return false;
            }
        });
        
        // Initiate global vars
        var fqItemListFolder,
          fqItemListFile,
          fqItemListPreselected,
          fqUserId,
          fqUserData,
          fqCurrentFigData = false,
          fqModalMode,
          fqModalFileTabMode = "my",
          fqCsrfToken,        
          fqLastFolderId = {
            my: false,
            shared: false,
            preselected: false,
          },
          fqSearchMode = false,
          fqHighlightedFids = false,
          fqExportDocType,
          fqExportDocQuality,
          fqExportDocSize,
          fqExportDocFname,
          fqExportMode,
          fqThumbWidth = 1000,
          _typeMap,
          fqDefaultMargins = { // in mm
            left: 15,
            top: 15,
            right: 15,
            bottom: 15,
          },
          fqDefaultSpacing = { // in mm
            horizontal: 5,
            vertical: 5,
          };
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
        const NSSVG = 'http://www.w3.org/2000/svg';
        
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

        const showZoomWarning = () => {
          jQuery("#fq-modal-warning-zoom").addClass("is-active");
          setTimeout(function(){ jQuery("#fq-modal-warning-zoom").removeClass("is-active"); }, 1250);
        }

        const getFqUserId = () => {
          jQuery
          .ajax({
            url: baseUrl + "v2/users/current",
            xhrFields: {withCredentials: true}
          })
          .done(function(data) {
            if (data.username) {
              jQuery("#fq-menu-login-btn").addClass("is-hidden");
              jQuery("#fq-menu-signup-btn").addClass("is-hidden");
              jQuery(".fq-menu-add-content-btn").removeClass("is-hidden");
              jQuery("#fq-menu-interact-switch-item").removeClass("is-hidden");
              jQuery("#fq-menu-file-open-figure").removeClass("is-hidden");
              jQuery("#fq-menu-file-save-figure").removeClass("is-hidden");
              jQuery("#fq-menu-file-save-figure-as").removeClass("is-hidden");
              jQuery("#fq-menu-file-import-local-content").removeClass("is-hidden");
              jQuery("#fq-breadcrumb-item-home")
              .data("fid", `${data.username}:-1`)
              .find(".fq-modal-folder-item")
              .data("fid", `${data.username}:-1`);
              
              fqUserId = data.username;
              jQuery("#fq-menu-account-user-name").html(fqUserId);
              jQuery("#fq-menu-account-navbar-item").removeClass("is-hidden");
              jQuery("#fq-menu-account-my-files").attr("href", baseUrl + "organize/home");
              jQuery("#fq-menu-account-sign-out").attr("href", baseUrl + "signout");
              jQuery("#fq-menu-account-settings").attr("href", baseUrl + "settings/profile");
              fqCsrfToken = data.csrf_token;
              fqUserData = data;
            } else {
              showToast("Could not retrieve current user data, are you logged in to FiglinQ in this browser?", "is-danger");
            }
          })
          .fail(function() {
            jQuery("#fq-menu-login-btn").removeClass("is-hidden");
            jQuery("#fq-menu-signup-btn").removeClass("is-hidden");
            jQuery(".fq-menu-add-content-btn").addClass("is-hidden");
            jQuery(".fq-menu-add-content-btn").addClass("is-hidden");
            jQuery(".fq-menu-add-content-btn").addClass("is-hidden");
            jQuery(".fq-menu-add-content-btn").addClass("is-hidden");
            showToast("Could not connect to FiglinQ!", "is-danger");
          });
        };

        const setInteractiveOff = () => {
          jQuery("#fq-menu-interact-switch").prop( "checked", false );
          const fObjects = jQuery("svg[class='fq-fobj-container']");
          fObjects.each(function() {
            var ref_id = jQuery(this).data("ref_id");
            jQuery("#"+ref_id).attr("visibility", "visible");
            this.remove();
          });          
        };

        const setInteractiveOn = () => {
          svgCanvas.clearSelection();
          const plotImages = jQuery('.fq-plot');
          
          var currentImg, newSvgObject, newElem;
          plotImages.each(function(){
            currentImg = jQuery(this);
            newSvgObject = generateSvgObject(currentImg);
            newElem = svgCanvas.addSVGElementFromJson(newSvgObject);
            // this.parentNode.insertAfter(newElem, this.nextSibling);
            this.setAttribute("visibility", "hidden");
          });
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
            ).each(function() {
              if (jQuery(this).data("fid") == fid) {
                return false;
              } else {
                jQuery(this).remove();
              }
            });
          } else if(fname){
            jQuery(breadcrumb(fid, fname)).insertAfter(".breadcrumb-item:last");
          } else {
            jQuery(".breadcrumb-item:not(#fq-breadcrumb-item-home)").remove();
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

        /**
         * Loads figure from url or opens content add modal
         * @returns {Null}
         */
        const loadFqFigure = () => {
          const fid = getUrlParameter('fid');
          const add = getUrlParameter('add');
          if(fid){
            svgCanvas.clear();
            openFigure({data: {fid: fid}});
          } else if(add){ // preload multiple files, open modal
            const fidArray = add.split(',');
            var checked = jQuery("#fq-menu-interact-switch").is(":checked");
            if(checked) jQuery("#fq-menu-interact-switch").click();
            fqModalFileTabMode = "preselected";
            prepareFileModal("addFiglinqPreselectedContent");
            refreshModalContents(fidArray);

            // svgEditor.configObj.curConfig.baseUnit = "mm";
            // svgEditor.configObj.curConfig.dimensions = [210,297];
            // svgCanvas.setConfig(svgEditor.configObj.curConfig);
            // svgEditor.updateCanvas();
              
          }
        };

        const getNumIdFromFid = (dataFid, index=1) => {
          if(!dataFid || !dataFid.includes(":")) return false;
          return dataFid.split(":")[index];
        }

        const getFileDataFromFiglinQ = (fid, endpoint="files") => {
          const url = `${baseUrl}v2/${endpoint}/${fid}`;
          return new Promise((resolve) => {
            jQuery
            .ajax({
              url: url,
              xhrFields: {
                withCredentials: true
              }
            })
            .done(function (data) {
              resolve(data)
            })
            .fail(function (error) {
              resolve(
                {
                  fid: fid,
                  error: error.responseJSON.detail,
                }
              );
            })
          })
        }

        const updateItemList = (dataFid, page, searchQuery=false) => {
          if(Array.isArray(dataFid)){
            // Get data for each file
            var elementProps = [];
            dataFid.forEach(fid => {
              elementProps.push(
                {
                  fid: fid,
                  endpoint: "files"
                }
              )
            });
            var actions = elementProps.map(
              function(prop) { 
                return getFileDataFromFiglinQ(prop.fid, prop.endpoint);
              }
            );
            var results = Promise.all(actions); // pass array of promises
            results.then(data => {
              var dataFormatted = {
                children: {
                  results: data,
                  next: null,
                }
              };
              fqItemListPreselected = {
                data: dataFormatted,
                fids: dataFid,
              };
              jQuery(".fq-modal-file-tab").removeClass("is-active");
              jQuery("#fq-modal-file-tab-preselected").removeClass("is-hidden");
              jQuery("#fq-modal-file-tab-preselected").addClass("is-active");
              populateFileModal(dataFormatted);
            });
            return;
          }

          const fid = getNumIdFromFid(dataFid);
          var url;

          const myFileTypes = fqModalMode == "upload" ? "filetype=fold" : "filetype=plot&filetype=fold&filetype=external_image"

          if (fqModalFileTabMode == "my") {
            url = searchQuery ?
            `${baseUrl}v2/folders/all?s=${searchQuery}&filetype=plot&filetype=external_image&page_size=1000` :
            `${baseUrl}v2/folders/${dataFid}?page=${page}&${myFileTypes}&order_by=filename&page_size=1000`;
          } else if(fqModalFileTabMode == "shared") {            
            if(fid == -1){
              url = `${baseUrl}v2/folders/shared?filetype=fold&filetype=plot&filetype=external_image&order_by=filename&page_size=1000`;
            } else {
              url = `${baseUrl}v2/folders/${dataFid}?page=${page}&filetype=fold&filetype=plot&filetype=external_image&order_by=filename&page_size=1000`;
            }
          }

          jQuery
            .ajax({
              url: url,
              xhrFields: {
                withCredentials: true
              }
            })
            .done(populateFileModal)
            .fail(function() {
              showToast("Communication error, file list has not been updated", "is-danger");
            })
            .always(function() {});
        };

        const populateFileModal = (data, selectedFids = false) => {
          jQuery("#fq-modal-files-open-figure-confirm").prop("disabled", true);
          let val = jQuery("#fq-modal-save-name-input").val();          
          if(val.length) {
            jQuery("#fq-modal-save-confirm-btn").prop("disabled", false);
          } else {
            jQuery("#fq-modal-save-confirm-btn").prop("disabled", true);
          }
          var index = 0, results = data.children.results;
          
          results.forEach(result => {
            const isFigure = ('svgedit' in result.metadata);
            const includeNonSvg = fqModalMode === "addContent" || fqModalMode === "upload";
            if (result.filetype === "fold" && !result.deleted) {
              fqItemListFolder += folderItem(result.filename, result.fid);
            } else if (isFigure && result.filetype === "external_image" && !result.deleted) {
              // TODO importing figures with external links into other figures is currently disabled, but could be enabled if they are inlined
              var haslinkedcontent = false;
              if(fqModalMode === "addContent" 
                && result.hasOwnProperty('metadata')
                && result.metadata.hasOwnProperty('svgedit')
                && result.metadata.svgedit.hasOwnProperty('haslinkedcontent')
                && result.metadata.svgedit.haslinkedcontent === true
                ) {
                  haslinkedcontent = true;
                }
              fqItemListFile += figureItem(result.filename, result.fid, index, haslinkedcontent);
              index += 1;
            } else if (includeNonSvg && !isFigure && result.filetype === "external_image" && !result.deleted) {
              fqItemListFile += imageItem(result.filename, result.fid, index);
              index += 1;
            } else if (includeNonSvg && result.filetype === "plot" && !result.deleted) {
              fqItemListFile += plotItem(result.filename, result.fid, index);
              index += 1;
            } else if('error' in result) {
              showToast(`Error loading file ${result.fid} - ${result.error}.`, 'is-danger');
            }
          });

          if (data.children.next == null) {
            jQuery(".panel-list-item").remove();
            jQuery("#fq-modal-item-list-container").html(
              fqItemListFolder + fqItemListFile
            );
            jQuery("#fq-modal-refresh-btn").removeClass("is-loading");
          } else {
            page = page + 1;
            updateItemList(dataFid, page);
          }
          var items = results.length == 1 ? "item" : "items";
          jQuery("#fq-modal-file-search-items-found").text(results.length + " " + items + " found");
          if(fqItemListPreselected && fqModalFileTabMode === "preselected"){
            fqItemListPreselected.fids.forEach(fid => {
              const isDisabled = jQuery("*[data-fid='" + fid + "']").hasClass("is-disabled"); 
              if(!isDisabled) jQuery("*[data-fid='" + fid + "']").addClass("is-active");
              
              jQuery("#fq-modal-add-confirm-btn").prop("disabled", false);
            });
          }

          if(fqHighlightedFids){
            fqHighlightedFids.forEach(fid => {
              jQuery("*[data-fid='" + fid + "']").addClass("is-active");
            })
            fqHighlightedFids = false;
          }
        }

        const generateSvgObject = (currentImg) => {

          const imgHref = currentImg.attr("href");
          const contentHref = decodeURIComponent(currentImg.data("content_href"));

          const contentHrefGuess = imgHref.replace(".svg", ".embed");
          const iframeSrc = contentHref == null ? contentHrefGuess : contentHref;
          
          const height = currentImg.attr("height");
          const width = currentImg.attr("width");
          const x = currentImg.attr("x");
          const y = currentImg.attr("y");
          const id = currentImg.attr("id");
          const originalDimensions = currentImg.data("original_dimensions").split(",");
          const fid = currentImg.data("fid");

          let newIframe = {
            element: "iframe",
            namespace: NS.HTML,
            attr: {
              x: 0,
              y: 0,
              width: originalDimensions[0],
              height: originalDimensions[1],
              id: svgCanvas.getNextId(),
              src: iframeSrc,
              xmlns: NS.HTML,
              allow: "fullscreen",
            }
          };

          let newBody = {
            element: "body",
            namespace: NS.HTML,
            attr: {
              id: svgCanvas.getNextId(),
              xmlns: NS.HTML,
            },
            children: [newIframe]
          };

          let newForeignObj = {
            element: "foreignObject",
            namespace: NS.SVG,
            attr: {
              x: 0,
              y: 0,
              width: originalDimensions[0],
              height: originalDimensions[1],
              id: svgCanvas.getNextId(),
              "xmlns": NS.SVG,
            },
            children: [newBody]
          };

          let newSvg = {
            element: "svg",
            namespace: NS.SVG,
            attr: {
              x: x,
              y: y,
              width: width,
              height: height,
              viewBox: `0 0 ${originalDimensions[0]} ${originalDimensions[1]}`,
              preserveAspectRatio: "none",
              id: svgCanvas.getNextId(),
              class: "fq-fobj-container",
              "data-ref_id": id,
              "data-fid": fid,
              xmlns: NS.SVG,
            },
            children: [newForeignObj]
          };

          return newSvg;
        };

        const placeElement = (imgProps) => {

          var attr = {
            xmlns: NS.SVG,
            preserveAspectRatio: "none",
            id: svgCanvas.getNextId(),
            style: "pointer-events:inherit",
            class: "fq-" + imgProps.filetype,
            href: imgProps.imgHref,
            width: imgProps.width,
            height: imgProps.height,
            x: imgProps.x,
            y: imgProps.y,
            "data-original_dimensions": `${imgProps.widthOriginal},${imgProps.heightOriginal}`,
            "data-fid": imgProps.fid,
          }

          if(imgProps.filetype == "plot") attr["data-content_href"] = imgProps.contentHref;

          const _img = {
            element: "image",
            namespace: NS.SVG,
            attr: attr,
          };

          const batchCmd = new BatchCommand('Insert plot');
          const newElem = svgCanvas.addSVGElementFromJson(_img);
          batchCmd.addSubCommand(new InsertElementCommand(newElem));
          svgCanvas.undoMgr.addCommandToHistory(batchCmd);
          svgCanvas.call('changed', [newElem]);
        };

        const getSvgFromEditor = () => {
          svgCanvas.clearSelection();

          // Temporarily switch units to pixels for correct viewbox settings
          var revertUnit = false; 
          const initialUnit = svgEditor.configObj.curConfig.baseUnit;
          if (initialUnit !== "px") {
            revertUnit = true;
            svgEditor.configObj.curConfig.baseUnit = "px";
            svgCanvas.setConfig(svgEditor.configObj.curConfig);
            svgEditor.updateCanvas();
          }

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
          
          // Revert back to previous units
          if (initialUnit !== "px" && revertUnit) {
            svgEditor.configObj.curConfig.baseUnit = initialUnit;
            svgCanvas.setConfig(svgEditor.configObj.curConfig);
            svgEditor.updateCanvas();
          }
          return svg;
        };

        const showToast = (msg, type) => {
          const duration = type === "is-danger" ? 10000 : 4000;
          bulmaToast.toast({ 
            message: msg, 
            type: type, 
            position: 'bottom-right',
            closeOnClick: true,
            dismissible: true,
            duration: duration,
          });
        };

        const ensureRulesGrids = () => {

          let showGrid = svgEditor.configObj.curConfig.showGrid;
          if(showGrid){
            jQuery("#fq-menu-view-show-grid").find("i").removeClass("fa-square").addClass("fa-check-square");
          } else {
            jQuery("#fq-menu-view-show-grid").find("i").addClass("fa-square").removeClass("fa-check-square");
          }

          let showRulers = svgEditor.configObj.curConfig.showRulers;
          if(showRulers){
            jQuery("#fq-menu-view-show-rulers").find("i").removeClass("fa-square").addClass("fa-check-square");
          } else {
            jQuery("#fq-menu-view-show-rulers").find("i").addClass("fa-square").removeClass("fa-check-square");
          }
        };

        const closeModalOnEscape = (e) => {
          if (e.key === "Escape") {
            jQuery("#fq-modal-file").removeClass("is-active");
            jQuery(document).unbind("keyup", closeModalOnEscape);
          }          
        }

        const refreshModalContents = (fidArray=false) => {

          fqItemListFolder = "";
          fqItemListFile = "";
          jQuery("#fq-modal-file").addClass("is-active");
          jQuery(document).keyup(closeModalOnEscape);

          let q = jQuery("#fq-modal-file-search-input").val();
          if(q && fqModalFileTabMode == "my"){
            jQuery("#fq-modal-file-search-icon").removeClass("fas fa-search");
            jQuery("#fq-modal-file-search-icon").addClass("far fa-times-circle");
          } else {
            jQuery("#fq-modal-file-search-icon").removeClass("far fa-times-circle");
            jQuery("#fq-modal-file-search-icon").addClass("fas fa-search");
          }

          q = q.length >= 2 ? q : false;

          if(fidArray) { // Open specific fids in modal
            updateItemList(fidArray, 1, q);
          } else if(q && fqModalFileTabMode == "my") { // Search query present, "My files" tab
            fqSearchMode = true;
            jQuery("#fq-modal-file-search-title").removeClass("is-hidden");
            jQuery("#fq-modal-file-panel-breadcrumb").addClass("is-hidden");
            updateItemList("shared", 1, q);
          } else {
            fqSearchMode = false;
            jQuery("#fq-modal-file-search-title").addClass("is-hidden");
            jQuery("#fq-modal-file-panel-breadcrumb").removeClass("is-hidden");

            if (fqLastFolderId[fqModalFileTabMode]) {
              updateItemList(fqLastFolderId[fqModalFileTabMode], 1);
            } else {
              fqLastFolderId[fqModalFileTabMode] = fqModalFileTabMode == "my" ?
                fqUserId + ":-1" :
                "shared:-1";
              updateItemList(fqLastFolderId[fqModalFileTabMode], 1);
            }
          }
          updateBreadcrumb(fqLastFolderId[fqModalFileTabMode], false);
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
            if (typeof fqCurrentFigData.metadata === 'string' || fqCurrentFigData.metadata instanceof String)
              fqCurrentFigData.metadata = JSON.parse(fqCurrentFigData.metadata);
            setTimeout(function(){ svgEditor.zoomChanged(window, "canvas"); }, 250);
            showToast('File "' + data.filename + '" loaded', 'is-success');

            // Add fid to url
            var currentUrl = new URL(document.location);
            currentUrl.searchParams.set("fid", data.fid);
            window.history.pushState(null, null, decodeURIComponent(currentUrl.href));

          })
          .fail(function(data) {
            showToast('This file could not be loaded', 'is-danger');
          });
        };

        const inlineRasterImage = async function(imgId) {
          var imgUrl = jQuery("#" + imgId).attr("href");
          
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
          jQuery('#'+imgId).attr("href", dataUrl);
        };

        const inlineSvgImage = async function(imgId) {
          var imgUrl = jQuery("#fq-svg-container").find('#'+imgId).attr("href");
          
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
          var fqElements = jQuery("#fq-svg-container").find(".fq-image, .fq-plot"),
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
                if (!(curAttr == "href" && isImage)) {
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

        const setModalConfirmBtnHandler = (handler, args=null) => {
          jQuery("#fq-modal-confirm-btn-ok").unbind("click", onConfirmClear);
          jQuery("#fq-modal-confirm-btn-ok").unbind("click", openFigure);

          jQuery("#fq-modal-confirm-btn-ok").on("click", args, handler);
        }

        const uploadFileToFiglinQ = (formData, apiEndpoint, world_readable, updateModal, parentId=false) => {
          var xFileName, successMsg, errorMsg;
          
          if(fqExportMode === "upload"){
            xFileName = fqExportDocFname;
            successMsg = " uploaded";
            errorMsg = " uploaded";
          } else {
            xFileName = fqExportDocFname;
            successMsg = " saved";
            errorMsg = " saved";
          } 

          var headers = {
            'X-File-Name': xFileName,
            'Plotly-World-Readable': world_readable,
            'X-CSRFToken': fqCsrfToken,
          };
          if(parentId){
            headers['Plotly-Parent'] = parentId;
          }

          jQuery.ajax({
            method: "POST",
            url: baseUrl + "v2/external-images/" + apiEndpoint,
            xhrFields: {withCredentials: true},
            headers: headers,
            data: formData,
            processData: false,
            contentType: false,
          })
          .done(function(response) {
            if(updateModal){
              jQuery("#fq-modal-refresh-btn").addClass("is-loading");
              fqItemListFolder = "";
              fqItemListFile = "";
              if(fqExportMode === "upload"){

                const userId = getNumIdFromFid(response.file.fid, 0);
                const fileNumId = getNumIdFromFid(response.file.fid, 1); 
                const baseHref = `${baseUrl}~${userId}/${fileNumId}.`;

                const ext = response.file.filetype === "plot" ? "svg" : "src";
                var elementProps = {
                  width: response.file.metadata.width,
                  height: response.file.metadata.height,
                  widthOriginal: response.file.metadata.width,
                  heightOriginal: response.file.metadata.height,
                  x: 0,
                  y: 0,
                  filetype: getSvgeditFiletype(response.file.filetype),
                  fid: response.file.fid,
                  contentHref: baseHref + "embed",
                  imgHref: baseHref + ext
                }  
                
                placeElement(elementProps);
  
              } else {
                jQuery("#fq-modal-file").removeClass("is-active");
                jQuery(document).unbind("keyup", closeModalOnEscape);
                var currentUrl = new URL(document.location);
                currentUrl.searchParams.set("fid", response.file.fid);
                window.history.pushState(null, null, decodeURIComponent(currentUrl.href));
                refreshModalContents();
              }
            }
            
            showToast("File " + response.file.filename + successMsg, "is-success");            
            if(fqExportMode !== "upload") {
              fqCurrentFigData = response.file;
              if (typeof fqCurrentFigData.metadata === 'string' || fqCurrentFigData.metadata instanceof String)
                fqCurrentFigData.metadata = JSON.parse(fqCurrentFigData.metadata);
            }

            jQuery("#fq-menu-file-save-figure")
              .find("i")
              .removeClass("fa-spinner fa-pulse")
              .addClass("fa-save");
            jQuery("#fq-modal-save-confirm-btn").removeClass("is-loading");
            if(fqExportMode !== "upload") jQuery("#fq-modal-file").removeClass("is-active");

          })
          .fail(function() {
            jQuery("#fq-menu-file-save-figure")
              .find("i")
              .removeClass("fa-spinner fa-pulse")
              .addClass("fa-save");
            jQuery("#fq-modal-save-confirm-btn").removeClass("is-loading");
            showToast("Error - file was not" + errorMsg, "is-danger");
          });
        }

        const showSaveFigureAsDialog = () => {
          if(fqCurrentFigData){
            var fName = fqCurrentFigData.filename.replace(/\.[^/.]+$/, "");
            jQuery("#fq-modal-save-name-input").val(fName);
            jQuery("#fq-modal-save-confirm-btn").prop("disabled", false);
          } else {
            jQuery("#fq-modal-save-name-input").val("");
          }
          fqModalFileTabMode = "my";
          prepareFileModal("saveFigureAs");
          refreshModalContents();
        }

        const createUnitMap = () => {
          // Get correct em/ex values by creating a temporary SVG.
          const svg = document.createElementNS(NSSVG, 'svg');
          document.body.append(svg);
          const rect = document.createElementNS(NSSVG, 'rect');
          rect.setAttribute('width', '1em');
          rect.setAttribute('height', '1ex');
          rect.setAttribute('x', '1in');
          svg.append(rect);
          const bb = rect.getBBox();
          svg.remove();

          const inch = bb.x;
          _typeMap = {
            em: bb.width,
            ex: bb.height,
            in: inch,
            cm: inch / 2.54,
            mm: inch / 25.4,
            pt: inch / 72,
            pc: inch / 6,
            px: 1,
            '%': 0
          };
        }

        const prepareFileModal = (mode, launchModal = true) => {
          var elements = [];
          var heading = "";
          switch (mode) {
            case "openFigure":
              elements.hide = ".modal-action-panel, .fq-modal-file-tab";
              elements.reveal = ".figure-open-panel, #fq-modal-file-tab-my, #fq-modal-file-tab-shared";
              elements.disable = "#fq-modal-files-open-figure-confirm";
              elements.activate = "#fq-modal-file-tab-my";
              heading = "Open figure";
              fqModalMode = "openFigure";
              break;
          
            case "saveFigure":
              
              break;
          
            case "saveFigureAs":
              elements.hide = ".modal-action-panel, .fq-modal-file-tab, #fq-modal-file-search-block, #fq-modal-file-tab-preselected, #fq-modal-file-tab-shared";
              elements.reveal = ".file-save-panel, #fq-modal-file-tab-my";
              elements.disable = "";
              elements.activate = "#fq-modal-file-tab-my";
              heading = "Save figure as";    
              fqModalMode = "saveFigure";              
              break;
          
            case "importLocalContent":
              elements.hide = ".modal-action-panel, .fq-modal-file-tab, #fq-modal-file-search-block, #fq-modal-file-tab-preselected, #fq-modal-file-tab-shared";
              elements.reveal = ".file-upload-panel, #fq-modal-file-tab-my";
              elements.disable = "#fq-modal-upload-confirm-btn";
              elements.activate = "#fq-modal-file-tab-my";
              heading = "Select destination folder in FiglinQ";    
              fqModalMode = "upload";
              fqExportMode = "upload";
              break;
          
            case "addFiglinqContent":
   
              elements.hide = ".modal-action-panel, .fq-modal-file-tab, #fq-modal-file-tab-preselected";
              elements.reveal = ".content-add-panel, .content-add-options-panel, #fq-modal-file-search-block, #fq-modal-file-tab-my, #fq-modal-file-tab-shared";
              elements.disable = "#fq-modal-add-confirm-btn";
              elements.activate = "#fq-modal-file-tab-my";
              heading = "Select content to add to this figure";
              fqModalMode = "addContent";

              // Update margin/spacing unit and values
              let curUnit = svgEditor.configObj.curConfig.baseUnit;
              var mlPx = fqDefaultMargins.left * _typeMap["mm"];
              var mtPx = fqDefaultMargins.top * _typeMap["mm"];
              var mrPx = fqDefaultMargins.right * _typeMap["mm"];
              var mbPx = fqDefaultMargins.bottom * _typeMap["mm"];
              var shPx = fqDefaultSpacing.horizontal * _typeMap["mm"];
              var svPx = fqDefaultSpacing.vertical * _typeMap["mm"];
              

              var mlTarget = Math.round(mlPx / _typeMap[curUnit] * 100) / 100;
              var mtTarget = Math.round(mtPx / _typeMap[curUnit] * 100) / 100;
              var mrTarget = Math.round(mrPx / _typeMap[curUnit] * 100) / 100;
              var mbTarget = Math.round(mbPx / _typeMap[curUnit] * 100) / 100;
              var shTarget = Math.round(shPx / _typeMap[curUnit] * 100) / 100;
              var svTarget = Math.round(svPx / _typeMap[curUnit] * 100) / 100;

              jQuery(".margin-unit").html(curUnit);
              jQuery("#fq-content-add-magin-left").val(mlTarget);
              jQuery("#fq-content-add-magin-top").val(mtTarget);
              jQuery("#fq-content-add-magin-right").val(mrTarget);
              jQuery("#fq-content-add-magin-bottom").val(mbTarget);
              jQuery("#fq-content-add-spacing-horizontal").val(shTarget);
              jQuery("#fq-content-add-spacing-vertical").val(svTarget);
              break;

            case "addFiglinqPreselectedContent":
              elements.hide = ".modal-action-panel, #fq-modal-file-panel-breadcrumb";
              elements.reveal = ".content-add-panel, #fq-modal-file-tab-my, #fq-modal-file-tab-shared";
              elements.disable = "#fq-modal-add-confirm-btn";
              elements.activate = "#fq-modal-file-tab-preselected";
              heading = "Select content to add to this figure";    
              fqModalMode = "addContent";
              break;
            default:
              break;
          }

          jQuery("#file-panel-heading").html(heading);
          jQuery(elements.hide).addClass("is-hidden");
          jQuery(elements.disable).prop("disabled", true);
          jQuery(elements.reveal).removeClass("is-hidden");          
          jQuery(elements.activate).addClass("is-active");
          if(launchModal) jQuery("#fq-modal-file").addClass("is-active");
        }

        const scaleElement = (fixedDim, elemWidth, elemHeight, refWidth, refHeight) => {
          
          var scaledDims = {};

          if (fixedDim === "width"){
            scaledDims.width = refWidth;
            scaledDims.height = Math.round(elemHeight * refWidth / elemWidth);
          } else if (fixedDim === "height"){
            scaledDims.width = Math.round(elemWidth * refHeight / elemHeight);
            scaledDims.height = refHeight;
          }
          return scaledDims;
        }

        const getSvgeditFiletype = (filetype) => {
          switch (filetype) {
            case "external_image":
              return "image";
            case "plot":
              return "plot";
            default:
              return false;
          } 
        }

        const getPlotProp = (element, propName, defaultPropValue) => {

          // If property is not defined in figure layout, look in template
          return element.figure.layout.hasOwnProperty(propName) ? 
            element.figure.layout[propName] : 
            ( element.figure.layout.template.layout.hasOwnProperty(propName) ? 
              element.figure.layout.template.layout[propName] : 
              defaultPropValue
            );
        }

        jQuery(document).on("change", "#fq-file-upload-input", () => {
          var fileName = jQuery('#fq-file-upload-input')[0].files.length ? jQuery('#fq-file-upload-input')[0].files[0].name : false;
          if(fileName){
            jQuery("#fq-modal-upload-confirm-btn").prop("disabled", false);
            jQuery("#fq-file-upload-input-label").html(fileName);
          } else {
            jQuery("#fq-modal-upload-confirm-btn").prop("disabled", true);
          }
        });

        jQuery(document).on("click", "#fq-modal-upload-confirm-btn", (e) => {
          e.target.blur();
          if(!jQuery('#fq-file-upload-input')[0].files.length) {
            showToast('Please select the file first!', 'is-warning');
            return;
          }
          const apiEndpoint = 'upload';
          var world_readable = jQuery("#fq-file-upload-world-readable").val();
          var imageFile = jQuery("#fq-file-upload-input")[0].files[0];
          fqExportDocFname = jQuery("#fq-file-upload-input-label").html();
          fqExportMode = "upload";

          var formData = new FormData();
          formData.append("files", imageFile);
          jQuery("#fq-modal-file").removeClass("is-active");
          uploadFileToFiglinQ(formData, apiEndpoint, world_readable, true, getNumIdFromFid(fqLastFolderId[fqModalFileTabMode], 1));
        });

        jQuery(document).on("change", "#fq-modal-export-format-select", () => {
          updateExportFormState();
        });

        jQuery(document).on("change", "#fq-doc-baseunit", (e) => {
          
          let curUnit = svgEditor.configObj.curConfig.baseUnit;
          let targetUnit = jQuery(e.target).val();
          
          var w = jQuery("#fq-doc-setup-width").val();
          var h = jQuery("#fq-doc-setup-height").val();

          var wNum = w.match(/\d+/)[0];
          var hNum = h.match(/\d+/)[0];

          var wToPx = wNum * _typeMap[curUnit];
          var wToTargetUnit = Math.round(wToPx / _typeMap[targetUnit] * 100) / 100;
          var hToPx = hNum * _typeMap[curUnit];
          var hToTargetUnit = Math.round(hToPx / _typeMap[targetUnit] * 100) / 100;

          svgEditor.configObj.curConfig.baseUnit = targetUnit;
          svgCanvas.setConfig(svgEditor.configObj.curConfig);
          svgEditor.updateCanvas();

          // Update inputs
          jQuery("#fq-doc-setup-width").val("" + wToTargetUnit + targetUnit);
          jQuery("#fq-doc-setup-height").val("" + hToTargetUnit + targetUnit);
          jQuery("#fq-doc-size").val("");
        });

        jQuery(document).on("change", "#fq-doc-setup-width", (e) => {
          jQuery("#fq-doc-size").val("");
          
          var w = jQuery(e.target).val();
          var resolution = svgEditor.svgCanvas.getResolution();
          var x = w;
          svgEditor.svgCanvas.setResolution(x, resolution.h);
        });

        jQuery(document).on("change", "#fq-doc-setup-height", (e) => {
          jQuery("#fq-doc-size").val("");
          
          var h = jQuery(e.target).val();
          var resolution = svgEditor.svgCanvas.getResolution();
          var y = h;
          svgEditor.svgCanvas.setResolution(resolution.w, y);
        });
        
        jQuery(document).on("change", "#fq-doc-size", (e) => {
          var w, h, val = jQuery(e.target).val();          
          if(val){
            const baseUnit = svgEditor.configObj.curConfig.baseUnit;
            var [w, h] = val.split("x");
            w = w / _typeMap[baseUnit] + baseUnit;
            h = h / _typeMap[baseUnit] + baseUnit;

            svgEditor.svgCanvas.setResolution(w, h);

            jQuery("#fq-doc-setup-width").val(w);
            jQuery("#fq-doc-setup-height").val(h);
          }
        });

        jQuery(document).on("click", "#fq-menu-file-export", () => {
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
        
        jQuery(document).on("click", "#fq-modal-btn-confirm-save-figure", (e) => {
          jQuery("#fq-modal-import-newfig").removeClass("is-active");
          showSaveFigureAsDialog();
        });
        
        jQuery(document).on("click", ".navbar-dropdown .navbar-item", (e) => {
          e.target.blur();
          jQuery(e.target).parents(".navbar-item.has-dropdown").removeClass("is-hoverable");
          setTimeout(function(){ 
            jQuery(e.target).parents(".navbar-item.has-dropdown").addClass("is-hoverable");
          }, 100);
        });

        jQuery(document).on("click", "#fq-menu-file-import-local-content", () => {
          prepareFileModal("importLocalContent");
          refreshModalContents();
        });

        jQuery(document).on("click", "#fq-modal-export-btn-export", async (e) => {
          jQuery(e.currentTarget).addClass("is-loading");
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
          jQuery(e.currentTarget).removeClass("is-loading");
        });

        jQuery(document).on("focusout", "#fq-modal-export-quality-input", (e) => {
          var newValue = parseInt(jQuery(e.target).val());
          if (newValue > 100) newValue = 100;            
          if (newValue < 10) newValue = 10;
          if (isNaN(newValue)) newValue = 80;
          jQuery(e.target).val(newValue);
        });

        jQuery(document).on("click", "#fq-menu-view-show-grid", () => {
          jQuery("#view_grid").click();
          let showGrid = svgEditor.configObj.curConfig.showGrid;
          if(showGrid){
            jQuery("#fq-menu-view-show-grid").find("i").removeClass("fa-square").addClass("fa-check-square");
          } else {
            jQuery("#fq-menu-view-show-grid").find("i").addClass("fa-square").removeClass("fa-check-square");
          }
        });
        
        jQuery(document).on("click", "#fq-menu-view-show-rulers", () => {
          let showRulers = svgEditor.configObj.curConfig.showRulers;
          if(!showRulers){
            jQuery("#fq-menu-view-show-rulers").find("i").removeClass("fa-square").addClass("fa-check-square");
          } else {
            jQuery("#fq-menu-view-show-rulers").find("i").addClass("fa-square").removeClass("fa-check-square");
          }
          svgEditor.configObj.curConfig.showRulers = !showRulers;
          svgEditor.rulers.display(!showRulers);
        });

        jQuery(document).on("click", "#fq-menu-file-document-properties", () => {
          jQuery("#fq-doc-size").val("");
          const baseUnit = svgEditor.configObj.curConfig.baseUnit;
          const resolution = svgEditor.svgCanvas.getResolution();

          jQuery("#fq-doc-baseunit").val(baseUnit);

          const gridSnappingOn = svgEditor.configObj.curConfig.gridSnapping;
          const gridSnappingStep = svgEditor.configObj.curConfig.snappingStep;

          jQuery("#fq-doc-setup-snapping-enabled").prop('checked', gridSnappingOn);
          jQuery("#fq-doc-setup-snapping-step").val(gridSnappingStep);

          jQuery("#fq-doc-setup-width").val(resolution.w / _typeMap[baseUnit] + baseUnit);
          jQuery("#fq-doc-setup-height").val(resolution.h / _typeMap[baseUnit] + baseUnit);
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

        jQuery(document).on("click", ".fq-modal-file-tab", (e) => {
          jQuery(".fq-modal-file-tab").removeClass("is-active");
          jQuery("#fq-modal-add-confirm-btn, #col_select").prop("disabled", true);
          jQuery(e.currentTarget).addClass("is-active");

          fqModalFileTabMode = jQuery(e.currentTarget).data("mode");
          if(fqModalFileTabMode == "shared"){
            jQuery("#fq-modal-file-search-wrapper").prop( "disabled", true );
          } else if(fqModalFileTabMode == "my"){
            jQuery("#fq-modal-file-search-wrapper").prop( "disabled", false );
          } else if(fqModalFileTabMode == "preselected"){
            jQuery("#fq-modal-file-search-wrapper").prop( "disabled", true );
            jQuery("#fq-modal-file-panel-breadcrumb").addClass("is-hidden");
            refreshModalContents(fqItemListPreselected.fids);
            return;
          }

          fqLastFolderId = {
            my: false,
            shared: false,
            preselected: false,
          },
          refreshModalContents();
        })

        jQuery(document).on("click", "#fq-modal-refresh-btn", () => {
          refreshModalContents();
        });

        jQuery(document).on("click", ".fq-modal-plot-item, .fq-modal-image-item, .fq-modal-figure-item", e => {

          if(fqModalMode === "saveFigure"){
            if(jQuery(e.target).hasClass("fq-modal-figure-item")){
              jQuery(".fq-modal-plot-item, .fq-modal-image-item, .fq-modal-figure-item").removeClass("is-active");
              jQuery(e.target).addClass("is-active");
              var text = jQuery(e.target).find(".fq-list-item-text").html();
              if(text.toLowerCase().endsWith(".svg")){
                text = text.replace(/\.[^/.]+$/, "");
                jQuery("#fq-modal-save-name-input").val(text);
                jQuery("#fq-modal-save-confirm-btn").prop("disabled", false);
              }
            }
            return
          }

          if(fqModalMode === "openFigure"){
            jQuery(".fq-modal-plot-item, .fq-modal-image-item, .fq-modal-figure-item").removeClass("is-active");
            jQuery(e.target).addClass("is-active");
            jQuery("#fq-modal-files-open-figure-confirm").prop("disabled", false);
            return
          }

          if (jQuery(e.target).hasClass("is-active")) {
            jQuery(e.target).removeClass("is-active");
          } else {
            jQuery(e.target).addClass("is-active");
          }

          var activePresent = false;
          var activeList = [];
          jQuery(".fq-modal-plot-item, .fq-modal-image-item, .fq-modal-figure-item").each(function() {
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
          const fname = jQuery(e.target)
            .text()
            .trim();
            
          fqLastFolderId[fqModalFileTabMode] = dataFid;

          updateBreadcrumb(dataFid, fname);

          fqItemListFolder = "";
          fqItemListFile = "";
          updateItemList(dataFid, 1);
          jQuery("#fq-modal-add-confirm-btn").prop("disabled", true);
          jQuery("#fq-modal-refresh-btn").addClass("is-loading");
        });
    
        jQuery(document).on("click", "#fq-menu-interact-switch", (e) => {
          e.target.blur();
          var checked = jQuery("#fq-menu-interact-switch").is(":checked");
          if (checked) {
            setInteractiveOn();
          } else {
            setInteractiveOff();
          }
        });

        jQuery(document).on("click", "#fq-modal-add-confirm-btn", e => {

          svgCanvas.clearSelection();
          e.target.blur();
          jQuery(e.target).addClass("is-loading");

          const selector = ".fq-modal-plot-item.is-active, .fq-modal-image-item.is-active, .fq-modal-figure-item.is-active";
          const selectedItems = getSortedElems(selector, "data-index");
          const columnNumber = jQuery("#col_select").val();
          var margins = {
            left: jQuery("#fq-content-add-magin-left").val(),
            top: jQuery("#fq-content-add-magin-top").val(),
            right: jQuery("#fq-content-add-magin-right").val(),
            bottom: jQuery("#fq-content-add-magin-bottom").val(),
          }
          var spacing = {
            horizontal: jQuery("#fq-content-add-spacing-horizontal").val(),
            vertical: jQuery("#fq-content-add-spacing-vertical").val(),
          }

          // Calculate margins/spacing in pixels
          let curUnit = svgEditor.configObj.curConfig.baseUnit;
          if(curUnit !== "px"){
            margins.left = margins.left * _typeMap[curUnit];
            margins.top = margins.top * _typeMap[curUnit];
            margins.right = margins.right * _typeMap[curUnit];
            margins.bottom = margins.bottom * _typeMap[curUnit];

            spacing.horizontal = spacing.horizontal * _typeMap[curUnit];
            spacing.vertical = spacing.vertical * _typeMap[curUnit];
          }
        
          var elementProps = [];
          jQuery.each(selectedItems, (index) => {
            elementProps[index] = {
              fid: jQuery(selectedItems[index]).data("fid"),
              endpoint: jQuery(selectedItems[index]).data("ftype") == "plot" ? "plots" : "files"
            };
          });
          
          const fixedDim = "height";
          var pageDims = svgEditor.svgCanvas.getResolution();
          var actions = elementProps.map(
            function(prop) { 
              return getFileDataFromFiglinQ(prop.fid, prop.endpoint);
            }
          );
          var results = Promise.all(actions); // pass array of promises
          results.then(data => {

            var x = 0;
            var y = 0;
            var curColumn = 1;

            // Default plot width / height
            const wDefault = 400;
            const hDefault = 360;

            // Reference plot width / height
            var wRef = wDefault;
            var hRef = hDefault;
            
            // If there is at least 1 plot, use it as size reference
            var refPlotIndex = false;
            data.some((element, index) => {
              // Get dimensions of the first selected plot, either from layout or from template (if not defined in layout) 
              const userId = getNumIdFromFid(element.fid, 0);
              const fileNumId = getNumIdFromFid(element.fid, 1); 
              const baseHref = `${baseUrl}~${userId}/${fileNumId}.`;
              var w, h;

              if(element.filetype == "plot") {
                w = getPlotProp(element, "width", wRef);
                h = getPlotProp(element, "height", hRef);
                
                // Set dimensions of the first plot as reference
                if(refPlotIndex === false) {
                  refPlotIndex = index;
                  wRef = w;
                  hRef = h;
                }

                data[index].imgHref = baseHref + "svg";
                data[index].svgeditFiletype = "plot";
              } else if(element.filetype == "external_image") {
                w = element.metadata.width;
                h = element.metadata.height;
                data[index].imgHref = baseHref + "src";
                data[index].svgeditFiletype = "image";
              };
              data[index].width = w ? w : wDefault;
              data[index].height = h ? h : hDefault;   
              data[index].contentHref = baseHref + "embed";
            });

            // Find the maximum width of all elements after applying the multi-column layout
            const pageWidthUsable = pageDims.w - margins.left - margins.right;
            var maxX = pageWidthUsable; // Only scale if layout is wider than the page minus margins, otherwise keep original plot dimensions
            data.some((element) => {
              const scaledDims = scaleElement(fixedDim, element.width, element.height, wRef, hRef)
              element.widthScaled = scaledDims.width;
              element.heightScaled = scaledDims.height;
              
              x += scaledDims.width + spacing.horizontal;
              maxX = Math.max(maxX, x);
              curColumn += 1;
              if(curColumn > columnNumber) {
                curColumn = 1;
                x = 0;
                y += hRef + spacing.vertical;
              }
            })

            // Subtract the final spacing
            maxX = maxX - spacing.horizontal;

            // Calculate scaling page factor
            const pageScaleFactor = pageWidthUsable / maxX;
            const hRefScaled = hRef * pageScaleFactor;

            // Reset positioning, this time including margins
            curColumn = 1;
            x = 0 + margins.left;
            y = 0 + margins.top;

            // Finally, place new elements
            data.some((element) => {
              element.widthScaled = element.widthScaled * pageScaleFactor;
              element.heightScaled = element.heightScaled * pageScaleFactor;

              var elementProps = {
                width: element.widthScaled,
                height: element.heightScaled,
                widthOriginal: element.width,
                heightOriginal: element.height,
                x: x,
                y: y,
                filetype: element.svgeditFiletype,
                fid: element.fid,
                contentHref: element.contentHref,
                imgHref: element.imgHref
              }

              placeElement(elementProps);
              
              x += element.widthScaled + spacing.horizontal;
              curColumn += 1;
              if(curColumn > columnNumber) {
                curColumn = 1;
                x = 0 + margins.left;
                y += hRefScaled + spacing.vertical;
              }
            })
            
            jQuery(e.target).removeClass("is-loading");
            jQuery("#fq-modal-file").removeClass("is-active");
            jQuery(document).unbind("keyup", closeModalOnEscape);
            setTimeout(function(){ svgEditor.zoomChanged(window, "layer");}, 500);
  
          });
        });

        jQuery(document).on("click", "#fq-modal-file-search-icon.fa-times-circle", (e) => {
          jQuery("#fq-modal-file-search-input").val("").keyup();
          fqSearchMode = false;
        });

        jQuery(document).on("keyup", "#fq-modal-file-search-input", (e) => {
          refreshModalContents();
        });

        jQuery(document).on("keyup", "#fq-modal-save-name-input", (e) => {
          let val = jQuery(e.target).val();
          
          if(val.length) {
            jQuery("#fq-modal-save-confirm-btn").prop("disabled", false);
          } else {
            jQuery("#fq-modal-save-confirm-btn").prop("disabled", true);
          }
        });

        jQuery(document).on("click", "#fq-modal-files-open-figure-confirm", () => {
          jQuery("#fq-modal-file").removeClass("is-active");
          jQuery(document).unbind("keyup", closeModalOnEscape);
          jQuery("#fq-modal-confirm-btn-ok").html("Open figure");
          jQuery("#fq-modal-confirm").addClass("is-active");
          let fid = jQuery(".fq-modal-figure-item.is-active").data("fid");
          setModalConfirmBtnHandler(openFigure, {fid: fid});
        });

        jQuery(document).on("click", "#fq-menu-file-new-figure", () => {
          jQuery("#fq-modal-confirm-btn-ok").html("New figure");
          setModalConfirmBtnHandler(onConfirmClear);
          jQuery("#fq-modal-confirm").addClass("is-active");
        });

        jQuery(document).on("click", "#fq-modal-save-confirm-btn", async (event) => {
          jQuery("#fq-modal-save-confirm-btn").addClass("is-loading");
          event.target.blur();
          fqExportMode = "thumb";
          fqExportDocType = "png";
          fqExportDocFname = jQuery("#fq-modal-save-name-input").val();
          fqExportDocSize = parseInt(jQuery("#fq-modal-export-size-select").val());            

          const world_readable = jQuery("#file_upload_world_readable").val();
          
          // TODO *properly* check if file name exists via API
          var replacedFid, nameExists = false;
          jQuery(".fq-modal-image-item, .fq-modal-figure-item").each(function() {
            if(jQuery(this).find(".fq-list-item-text").html() == fqExportDocFname + ".svg") {
              nameExists = true;
              replacedFid = jQuery(this).data("fid");
            }
          });

          if(nameExists){
            if(!confirm("File already exists. Overwrite?")) {
              jQuery("#fq-modal-save-confirm-btn").removeClass("is-loading");
              return;
            }
          }
          
          const svg = getSvgFromEditor();
          const apiEndpoint = nameExists ? 'replace' : 'upload';

          var imageBlob = new Blob([svg], {type:'image/svg+xml'});
          var imageFile = new File([imageBlob], fqExportDocFname + ".svg");
          
          var thumbBlob = await exportImageFromEditor();
          var thumbFile = new File([thumbBlob], fqExportDocFname + "_thumb.png");

          var formData = new FormData();

          formData.append("files", imageFile);
          formData.append("thumb", thumbFile);

          // Check if figure contains any linked content
          var fqElements = jQuery(".fq-image, .fq-plot, .fq-figure");
          const hasLinkedContent = fqElements.length > 0;

          // Add metadata
          var metadata = fqCurrentFigData ? fqCurrentFigData.metadata : {};
          metadata.svgedit = metadata.svgedit || {};
          if(hasLinkedContent){
            metadata.svgedit.haslinkedcontent = true;
          } else {
            metadata.svgedit.haslinkedcontent = false;
          }
          formData.append("metadata", JSON.stringify(metadata));

          if(nameExists) formData.append("replaced_fid", replacedFid);

          uploadFileToFiglinQ(formData, apiEndpoint, world_readable, true, getNumIdFromFid(fqLastFolderId[fqModalFileTabMode], 1));

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
          setInteractiveOff();
          prepareFileModal("addFiglinqContent");
          refreshModalContents();
        });

        jQuery(document).on("click", "#fq-menu-file-save-figure", async (event) => {
          
          setInteractiveOff();
          
          if(!fqCurrentFigData){
            showSaveFigureAsDialog();
            return;
          }

          jQuery("#fq-menu-file-save-figure")
            .find("i")
            .removeClass("fa-save")
            .addClass("fa-spinner fa-pulse");
          event.target.blur();
          
          fqExportMode = "thumb";
          fqExportDocType = "png";
          fqExportDocFname = fqCurrentFigData.filename;
          fqLastFolderId[fqModalFileTabMode] = fqCurrentFigData.owner + ':' + fqCurrentFigData.parent;
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

          // Check if figure contains any linked content
          var fqElements = jQuery(".fq-image, .fq-plot, .fq-figure");
          const hasLinkedContent = fqElements.length > 0;

          var metadata = fqCurrentFigData.metadata || {};
          metadata.svgedit = metadata.svgedit || {};
          if(hasLinkedContent){
            metadata.svgedit.haslinkedcontent = true;
          } else {
            metadata.svgedit.haslinkedcontent = false;
          }

          formData.append("metadata", JSON.stringify(metadata));

          const parentId = fqCurrentFigData.owner === fqUserId ?
            fqCurrentFigData.parent :
            false;
          
          uploadFileToFiglinQ(formData, apiEndpoint, world_readable, false, parentId);
        })

        jQuery(document).on("click", "#fq-menu-file-save-figure-as", () => {
          setInteractiveOff();
          showSaveFigureAsDialog();
        }); 

        jQuery(document).on("click", ".navbar-burger", () => {
          jQuery(".navbar-burger").toggleClass("is-active");
          jQuery(".navbar-menu").toggleClass("is-active");
        });

        jQuery(document).on("click", "#fq-menu-file-open-figure", () => {
          prepareFileModal("openFigure");          
          refreshModalContents();
        });

        // Init
        createUnitMap();
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
