import { folderItem, plotItem, imageItem, breadcrumb } from "./elements";
import { NS } from "../../../common/namespaces.js";

/**
 * @file ext-figlinq.js
 *
 * @license MIT
 *
 * @copyright 2021 figlinq.com
 *
 */

// jQuery.fn.reverse = [].reverse;
const name = "figlinq";
const baseUrl = location.hostname == "localhost" ? "https://plotly.local/" : "https://create.figlinq.com/";

const loadExtensionTranslation = async function(svgEditor) {
  let translationModule;
  const lang = svgEditor.configObj.pref("lang");
  try {
    // eslint-disable-next-line no-unsanitized/method
    translationModule = await import(`./locale/${lang}.js`);
  } catch (_error) {
    // eslint-disable-next-line no-console
    console.warn(`Missing translation (${lang}) for ${name} - using 'en'`);
    // eslint-disable-next-line no-unsanitized/method
    translationModule = await import(`./locale/en.js`);
  }
  svgEditor.i18next.addResourceBundle(lang, name, translationModule.default);
};

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
            fqLastFolderId = false,
            csrf_token = "QsqJChOV9ra5FhreGlIQujW72gfE7oU0A9ZNq0TrwkUY7B2WvFphOQMa2gtWVc20";        
        
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
              fqUserId = data.username;
            }
          })
          .fail(function() {});
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
              var results = data.children.results;
              var index = 0;
              results.forEach(result => {
                const currentFid = result.fid.includes(":")
                  ? result.fid.substring(result.fid.indexOf(":") + 1)
                  : result.fid;

                if (result.filetype === "fold" && !result.deleted) {
                  fqItemListFolder += folderItem(result.filename, currentFid);
                } else if (result.filetype === "external_image" && !result.deleted) {
                  fqItemListFile += imageItem(result.filename, currentFid, index);
                  index = +1;
                } else if (result.filetype === "plot" && !result.deleted) {
                  fqItemListFile += plotItem(result.filename, currentFid, index);
                  index = +1;
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
            .fail(function() {})
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

        const loadHomeDirContents = () => {
       
          if (fqLastFolderId) {
            jQuery("#fq-modal-content").addClass("is-active");
          } else {
            var fid = "-1";
            fqLastFolderId = fid;
            fqItemListFolder = "";
            fqItemListFile = "";
            updateItemList(fid, 1);
          }
        }

        jQuery(document).on("click", "#fq-modal-cancel-btn", () => {
          jQuery("#fq-modal-content").removeClass("is-active");
        });

        jQuery(document).on("click", "#fq-modal-refresh-btn", () => {
          jQuery("#fq-modal-refresh-btn").addClass("is-loading");
          fqItemListFolder = "";
          fqItemListFile = "";
          updateItemList(fqLastFolderId, 1);
        });

        jQuery(document).on("click", ".fq-modal-plot-item, .fq-modal-image-item", e => {

          if(fqModalMode === "saveContent"){
            if(jQuery(e.target).hasClass("fq-modal-image-item")){
              jQuery(".fq-modal-plot-item, .fq-modal-image-item").removeClass("is-active");
              jQuery(e.target).addClass("is-active");
              var text = jQuery(e.target).find(".fq-list-item-text").html();
              jQuery("#fq-modal-save-name-input").val(text);
              jQuery("#fq-modal-save-confirm-btn").prop("disabled", false);
            }
            return
          }

          const dataFid = jQuery(e.target)
            .data("fid")
            .toString();
          const fid = dataFid.includes(":")
            ? dataFid.substring(dataFid.indexOf(":") + 1)
            : dataFid;           

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

        jQuery(document).on("click", "#fq-menu-item-save-figure", () => {
         
          jQuery(".file-save-panel").removeClass("is-hidden");
          jQuery(".content-add-panel").addClass("is-hidden");
          jQuery("#file-panel-heading").html("Save figure");
          jQuery("#fq-modal-content").addClass("is-active");
          jQuery("#fq-modal-save-confirm-btn").prop("disabled", true);
          jQuery("#fq-modal-save-name-input").val("");

          loadHomeDirContents();
          fqModalMode = "saveContent";

        });

        jQuery(document).on("click", "#fq-modal-save-confirm-btn", () => {

          const world_readable = jQuery("#world_readable").val();
          const fname = jQuery("#fq-modal-save-name-input").val();
          
          // Check if name exists
          var replacedFid, nameExists = false;
          jQuery(".fq-modal-image-item").each(function() {
            if(jQuery(this).find(".fq-list-item-text").html() == fname) {
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

          // TODO: move figure editor to the same subdomain, so that all cookies can be accessed
          // var csrf_token = Cookies.get('plotly_csrf_on');

          jQuery.ajax({
            method: "POST",
            url: baseUrl + "v2/external-images/" + apiEndpoint,
            xhrFields: {
              withCredentials: true
            },
            headers: {
              'X-File-Name': fname, 
              'Plotly-World-Readable': world_readable,
              'Plotly-Parent': fqLastFolderId,
              'X-CSRFToken': csrf_token,
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

          jQuery(".file-save-panel").addClass("is-hidden");
          jQuery(".content-add-panel").removeClass("is-hidden");
          jQuery("#file-panel-heading").html("Select content");

          loadHomeDirContents();
          fqModalMode = "addContent";

        });

        // Init
        jQuery("#fq-menu-interact-switch").prop( "checked", false );
        ensureElementLowercase();
        getFqUserId(); 
        setInteractiveOff();
        replaceZoom();
      },
    };
  }
};
