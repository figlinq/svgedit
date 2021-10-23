import { folderItem, plotItem, imageItem, breadcrumb } from "./elements";
import { NS } from "../../../common/namespaces.js";
import { convertUnit, isValidUnit } from '../../../common/units.js';

/**
 * @file ext-figlinq.js
 *
 * @license MIT
 *
 * @copyright 2021 figlinq.com
 *
 */

const name = "figlinq";
const baseUrl = location.hostname == "localhost" ? "https://plotly.local/" : "https://create.figlinq.com/";

export default {
  name,
  async init() {
    const svgEditor = this;
    const { svgCanvas } = svgEditor;
    // const { imgPath } = svgEditor.configObj.curConfig;
    // await loadExtensionTranslation(svgEditor);
    return {
      name: svgEditor.i18next.t(`${name}:name`),
      callback() {
        
        // Initiate global vars
        var fqItemListFolder,
            fqItemListFile,
            fqUserId,
            fqModalMode,
            fqCsrfToken,        
            fqLastFolderId = false;
        
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
              <option value="selection">Fit to election</option>
              <option value="layer">Fit to layer content</option>
              <option value="content">Fit to all content</option>
            </select>
          </div>`;
          jQuery("#zoom").replaceWith(element);
        }

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
              jQuery(".fq-menu-interact-switch-item").removeClass("is-hidden");
              jQuery("#fq-menu-item-open-figure").removeClass("is-hidden");
              jQuery("#fq-menu-item-save-figure").removeClass("is-hidden");
              
              fqUserId = data.username;
              fqCsrfToken = data.csrf_token;
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
        }

        const ensureElementLowercase = () => {
          
          var str = svgCanvas.getSvgString();
          
          if(str.includes("BODY")) {
            str = str.replaceAll("BODY", "body");
          }
          
          if(str.includes("IFRAME")) {
            str = str.replaceAll("IFRAME", "iframe");
          }          
          svgEditor.loadSvgString(str);
        }

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
                class: "fq-image-element fq-plot"
              }
            });
            newImage.setAttributeNS(NS.XLINK, "xlink:href", url);
            this.replaceWith(newImage);
          });
          document.activeElement.blur();
        };

        const setInteractiveOn = () => {
          var currentUrl, src, height, width, x, y, newForeignObj, newElem;
          const plotImages = jQuery('.fq-image-element.fq-plot');
          
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
        }

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
              jQuery("#fq-modal-open-confirm-btn").prop("disabled", true);
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
                jQuery("#item_list_container").html(
                  fqItemListFolder + fqItemListFile
                );
                jQuery("#fq-modal-content").addClass("is-active");
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
        }

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
              class: "fq-image-element" + " fq-" + selectedType,
            }
          });
          newImage.setAttributeNS(NS.XLINK, "xlink:href", url);
        };

        const saveSvgToFiglinq = () => {
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
        }

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
        }

        const refreshModalContents = () => {

          fqItemListFolder = "";
          fqItemListFile = "";
          if (fqLastFolderId) {
            jQuery("#fq-modal-content").addClass("is-active");
            updateItemList(fqLastFolderId, 1);
          } else {
            var fid = "-1";
            fqLastFolderId = fid;
            updateItemList(fid, 1);
          }
        }

        const inlineImage = async function(img) {
          var src = jQuery(img).attr("src");
          let blob = await fetch(src).then(r => r.blob());
          let dataUrl = await new Promise(resolve => {
            let reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          jQuery(img).attr("src", dataUrl);
        };

        jQuery(document).on("change", "#fq-doc-baseunit", (e) => {
          let baseunit = jQuery(e.target).val();

          svgEditor.configObj.curConfig.baseUnit = baseunit;
          svgCanvas.setConfig(svgEditor.configObj.curConfig);
          svgEditor.updateCanvas();
        });

        jQuery(document).on("change", "#fq-doc-size", (e) => {
          var w, h, val = jQuery(e.target).val();          
          if(val){
            const dims = val.split("x");
            w = dims[0];
            h = dims[1];
            // const resolution = svgEditor.svgCanvas.getResolution();
            if (svgEditor.configObj.curConfig.baseUnit !== "px") {
              w = convertUnit(w) + svgEditor.configObj.curConfig.baseUnit;
              h = convertUnit(h) + svgEditor.configObj.curConfig.baseUnit;
            }

            jQuery("#fq-doc-setup-width").val(w);
            jQuery("#fq-doc-setup-height").val(h);
          }
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

          jQuery("#fq-doc-setup-width").val(resolution.w);
          jQuery("#fq-doc-setup-height").val(resolution.h);
          jQuery("#fq-modal-doc-setup").addClass("is-active");
          
        });
        
        jQuery(document).on("click", "#fq-doc-setup-save-btn", () => {

          const predefined = jQuery("#fq-doc-size").val();
          const w = predefined === 'fit' ? 'fit' : jQuery("#fq-doc-setup-width").val();
          const h = predefined === 'fit' ? 'fit' : jQuery("#fq-doc-setup-height").val();
          const baseunit = jQuery("#fq-doc-baseunit").val();

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
          svgCanvas.setConfig(svgEditor.configObj.curConfig);
          svgEditor.updateCanvas();
                
          jQuery("#fq-modal-doc-setup").removeClass("is-active");
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
            jQuery(".fq-modal-image-item").removeClass("is-active");
            jQuery(e.target).addClass("is-active");
            jQuery("#fq-modal-open-confirm-btn").prop("disabled", false);
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
            selectedFid, selectedType, ext;

          jQuery.each(selectedItems, index => {
            
            selectedFid = jQuery(selectedItems[index]).data("fid");
            selectedType = jQuery(selectedItems[index]).data("ftype");

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
                  jQuery("#fq-modal-content").removeClass("is-active");
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
              jQuery("#fq-modal-content").removeClass("is-active");
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

        jQuery(document).on("click", "#fq-modal-save-confirm-btn", () => {

          const world_readable = jQuery("#world_readable").val();
          const fname = jQuery("#fq-modal-save-name-input").val();
          
          // Check if name exists
          var replacedFid, nameExists = false;
          jQuery(".fq-modal-image-item").each(function() {
            if(jQuery(this).find(".fq-list-item-text").html() == fname + ".svg") {
              nameExists = true;
              replacedFid = fqUserId + ":" + jQuery(this).data('fid');
            }
          });

          if(nameExists){
            if(!confirm("File already exists. Overwrite?")) return;
          }
          
          const svg = saveSvgToFiglinq();
          const apiEndpoint = nameExists ? 'replace' : 'upload';

          var blob = new Blob([svg], {type:'image/svg+xml'});
          var file = new File([blob], fname + ".svg");

          var formData = new FormData();
          formData.append("files", file);
          if(nameExists) formData.append("replaced_fid", replacedFid);

          jQuery.ajax({
            method: "POST",
            url: baseUrl + "v2/external-images/" + apiEndpoint,
            xhrFields: {
              withCredentials: true
            },
            headers: {
              'X-File-Name': fname + ".svg",
              'Plotly-World-Readable': world_readable,
              'Plotly-Parent': fqLastFolderId,
              'X-CSRFToken': fqCsrfToken,
            },
            data: formData,
            processData: false,
            contentType: false,
          })
          .done(function() {
            jQuery("#fq-modal-refresh-btn").addClass("is-loading");
            fqItemListFolder = "";
            fqItemListFile = "";
            updateItemList(fqLastFolderId, 1);
            showToast("File saved", "is-success");
          })
          .fail();
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
          // refreshModalContents();

        });

        jQuery(document).on("click", "#fq-menu-item-save-figure", () => {
         
          jQuery(".modal-action-panel").addClass("is-hidden");
          jQuery("#file-panel-heading").html("Save figure");
          jQuery(".file-save-panel").removeClass("is-hidden");

          jQuery("#fq-modal-content").addClass("is-active");
          jQuery("#fq-modal-save-confirm-btn").prop("disabled", true);
          jQuery("#fq-modal-save-name-input").val("");

          fqModalMode = "saveFigure";
          refreshModalContents();
          // refreshModalContents();

        });

        jQuery(document).on("click", "#fq-menu-item-open-figure", () => {
         
          jQuery(".modal-action-panel").addClass("is-hidden");
          jQuery("#file-panel-heading").html("Open figure");
          jQuery(".figure-open-panel").removeClass("is-hidden");

          jQuery("#fq-modal-content").addClass("is-active");
          jQuery("#fq-modal-open-confirm-btn").prop("disabled", true);

          fqModalMode = "openFigure";
          refreshModalContents();
          // refreshModalContents();

        });

        // Init
        jQuery("#fq-menu-interact-switch").prop( "checked", false );
        ensureElementLowercase();
        ensureRulesGrids();
        getFqUserId(); 
        setInteractiveOff();
        replaceZoom();
      },
    };
  }
};
