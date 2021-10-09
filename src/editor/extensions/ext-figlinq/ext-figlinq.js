import { testData, testData2, userData, plotData } from "./testData";
import { folderItem, plotItem, imageItem, breadcrumb } from "./elements";
import { NS } from "../../../common/namespaces.js";

/**
 * @file ext-figlinq.js
 *
 * @license MIT
 *
 * @copyright 2010 Alexis Deveria
 *
 */

/**
 * This is a very basic SVG-Edit extension. It adds a "Hello World" button in
 *  the left ("mode") panel. Clicking on the button, and then the canvas
 *  will show the user the point on the canvas that was clicked on.
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
  async init({ _importLocale }) {
    const svgEditor = this;
    const { imgPath } = svgEditor.configObj.curConfig;
    await loadExtensionTranslation(svgEditor);
    const { svgCanvas } = svgEditor;
    const { $id } = svgCanvas;
    return {
      name: svgEditor.i18next.t(`${name}:name`),
      callback() {
        var itemListFolder, itemListFile, figlinqUserId;
        var dataJSON;
        jQuery
          .ajax({
            url: baseUrl + "v2/users/current",
            xhrFields: {
              withCredentials: true
            }
          })
          .done(function(data) {
            dataJSON = typeof data !== "object" ? JSON.parse(data) : data;
            if (dataJSON.username != "") {
              jQuery(".add_figlinq_content").removeClass("is-hidden");
              jQuery("#log_in").addClass("is-hidden");
              jQuery("#sign_up").addClass("is-hidden");
              figlinqUserId = dataJSON.username;
            }
          })
          .fail(function() {});
        
        // To use this function we need to get content_type field into the "children" object returned from v2 
        const getExt = (contentType) => {
          if (contentType == "image/jpeg" || contentType == "image/jpg") return "jpg";
          if (contentType == "image/svg" || contentType == "image/svg+xml") return "svg";
          if (contentType == "image/png") return "png";
          if (contentType == "image/bmp") return "bmp";
          if (contentType == "image/gif") return "gif";
        }

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
            figlinqUserId +
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
              var dataJSON = typeof data !== "object" ? JSON.parse(data) : data;
              var results = dataJSON.children.results;
              var index = 0;
              results.forEach(result => {
                const currentFid = result.fid.includes(":")
                  ? result.fid.substring(result.fid.indexOf(":") + 1)
                  : result.fid;

                if (result.filetype === "fold" && !result.deleted) {
                  itemListFolder += folderItem(result.filename, currentFid);
                } else if (result.filetype === "external_image" && !result.deleted) {
                  itemListFile += imageItem(result.filename, currentFid, index);
                  index = +1;
                } else if (result.filetype === "plot" && !result.deleted) {
                  itemListFile += plotItem(result.filename, currentFid, index);
                  index = +1;
                }
              });

              if (dataJSON.children.next == null) {
                jQuery(".panel-list-item").remove();
                jQuery("#item_list_container").html(
                  itemListFolder + itemListFile
                );
                jQuery("#modal_add_chart").addClass("is-active");
                jQuery("#refresh_item_list").removeClass("is-loading");
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
              id: svgEditor.svgCanvas.getNextId(),
              src: src
            }
          };

          let newBody = {
            element: "body",
            attr: {
              id: svgEditor.svgCanvas.getNextId(),
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
              id: svgEditor.svgCanvas.getNextId(),
              class: "figlinq-fobject"
            },
            children: [newBody]
          };
          return newForeignObj;
        }

        jQuery(document).on("click", "#cancel_add_chart", () => {
          jQuery("#modal_add_chart").removeClass("is-active");
        });

        jQuery(document).on("click", "#refresh_item_list", () => {
          jQuery("#refresh_item_list").addClass("is-loading");
          itemListFolder = "";
          itemListFile = "";
          const lastFid = jQuery("#modal_add_chart").data("lastFid");
          updateItemList(lastFid, 1);
        });

        jQuery(document).on("click", ".plot-item, .image-item", e => {
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
          jQuery(".plot-item, .image-item").each(function() {
            if (jQuery(this).hasClass("is-active")) {
              activePresent = true;
              activeList.push(jQuery(this).data("fid"));
            }
          });

          if (activePresent) {
            jQuery("#confirm_add_content").prop("disabled", false);
            jQuery("#confirm_add_content").data("selectedFid", activeList);
            if (activeList.length > 1) {
              jQuery("#col_select").prop("disabled", false);
            } else {
              jQuery("#col_select").prop("disabled", true);
            }
          } else {
            jQuery("#confirm_add_content").prop("disabled", true);
          }
        });

        jQuery(document).on("click", ".folder-item", e => {
          const dataFid = jQuery(e.currentTarget)
            .data("fid")
            .toString();
          const fid = dataFid.includes(":")
            ? dataFid.substring(dataFid.indexOf(":") + 1)
            : dataFid;
          const fname = jQuery(e.target)
            .text()
            .trim();
          jQuery("#modal_add_chart").data("lastFid", fid);

          updateBreadcrumb(fid, fname);

          itemListFolder = "";
          itemListFile = "";
          updateItemList(fid, 1);
          jQuery("#confirm_add_content").prop("disabled", true);
          jQuery("#refresh_item_list").addClass("is-loading");
        });

        const importImage = (url, width = "auto", height = "auto", x, y, selectedType) => {
          const newImage = svgEditor.svgCanvas.addSVGElementFromJson({
            element: "image",
            attr: {
              x: x,
              y: y,
              width: width,
              height: height,
              id: svgEditor.svgCanvas.getNextId(),
              style: "pointer-events:inherit",
              class: "figlinq-image"
            }
          });
          newImage.setAttributeNS(NS.XLINK, "xlink:href", url);
          newImage.setAttribute('data-ftype', selectedType);
        };

        jQuery(document).on("click", "#inter_switch", () => {
          var checked = jQuery("#inter_switch").is(":checked");
          if (checked) {
            var currentUrl, src, height, width, x, y, newForeignObj, newElem;
            const plotImages = jQuery('.figlinq-image[data-ftype="plot"]');

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
            var str = svgCanvas.getSvgString();
            str = str.replace("BODY", "body");
            str = str.replace("IFRAME", "iframe");
            svgEditor.loadSvgString(str);
          } else {
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

              const newImage = svgEditor.svgCanvas.addSVGElementFromJson({
                element: "image",
                attr: {
                  x: x,
                  y: y,
                  width: width,
                  height: height,
                  id: svgCanvas.getNextId(),
                  style: "pointer-events:inherit",
                  class: "figlinq-image"
                }
              });
              newImage.setAttributeNS(NS.XLINK, "xlink:href", url);
              newImage.setAttribute('data-ftype', 'plot');
              this.replaceWith(newImage);
            });
          }
        });

        jQuery(document).on("click", "#confirm_add_content", e => {
          jQuery(e.target).addClass("is-loading");
          const selector = ".plot-item.is-active, .image-item.is-active";
          const selectedPlots = getSortedElems(selector, "data-index");
          var x = 0,
            y = 0,
            colNumber = jQuery("#col_select").val(),
            curCol = 1,
            selectedFid, selectedType, ext;

          jQuery.each(selectedPlots, index => {
            selectedFid = jQuery(selectedPlots[index]).data("fid");
            selectedType = jQuery(selectedPlots[index]).data("ftype");

            var imgDataUrl =
              baseUrl + "v2/plots/" +
              figlinqUserId +
              ":" +
              selectedFid;
            
            ext = selectedType === "plot" ? ".svg" : ".src";
            const importUrl = 
              baseUrl + "~" +
              figlinqUserId +
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
                .done(function(dataJSON) {
                  var width = dataJSON.figure.layout.width
                    ? dataJSON.figure.layout.width
                    : 400;
                  var height = dataJSON.figure.layout.height
                    ? dataJSON.figure.layout.height
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
                  jQuery("#modal_add_chart").removeClass("is-active");
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
              jQuery("#modal_add_chart").removeClass("is-active");
            }
          });
        });

        jQuery(document).on("click", ".add_figlinq_content", () => {
          var lastFid = jQuery("#modal_add_chart").data("lastFid");
          if (lastFid) {
            jQuery("#modal_add_chart").addClass("is-active");
          } else {
            var fid = "-1";
            jQuery("#modal_add_chart").data("lastFid", fid);
            itemListFolder = "";
            itemListFile = "";
            updateItemList(fid, 1);
          }

          // if (svgCanvas.getMode() === "hello_world") {
          //   svgCanvas.setMode(undefined);
          // } else {
          //   svgCanvas.setMode("hello_world");
          // }
        });
      },

      // This is triggered when the main mouse button is pressed down
      // on the editor canvas (not the tool panels)
      mouseDown() {
        // Check the mode on mousedown
        if (svgCanvas.getMode() === "hello_world") {
          // The returned object must include "started" with
          // a value of true in order for mouseUp to be triggered
          return { started: true };
        }
        return undefined;
      },

      // This is triggered from anywhere, but "started" must have been set
      // to true (see above). Note that "opts" is an object with event info
      mouseUp(opts) {
        // Check the mode on mouseup
        if (svgCanvas.getMode() === "hello_world") {
          const zoom = svgCanvas.getZoom();

          // Get the actual coordinate by dividing by the zoom value
          const x = opts.mouse_x / zoom;
          const y = opts.mouse_y / zoom;

          // We do our own formatting
          const text = svgEditor.i18next.t(`${name}:text`, { x, y });
          // Show the text using the custom alert function
          // alert(text);
        }
      }
    };
  }
};
