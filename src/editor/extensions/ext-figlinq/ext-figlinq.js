import testData from "./testData";
import { folderItem, plotItem, parentItem, breadcrumb } from "./elements";
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
        var itemListFolder, itemListChart, figlinqUserId;

        // Get user ID
        var urlInit =
          location.hostname == "localhost"
            ? "https://755a6c50-f66a-452b-8141-90ea5218e958.mock.pstmn.io/users/current"
            : "https://create.figlinq.com/v2/users/current";
        var withCredentials = location.hostname == "localhost" ? false : true;

        jQuery
          .ajax({
            url: urlInit,
            xhrFields: {
              withCredentials: withCredentials
            }
          })
          .done(function(data) {
            var dataJSON = typeof data !== "object" ? JSON.parse(data) : data;
            if (dataJSON.username != "") {
              jQuery("#add_chart").removeClass("is-hidden");
              jQuery("#log_in").addClass("is-hidden");
              jQuery("#sign_up").addClass("is-hidden");
              figlinqUserId = dataJSON.username;
            }
          });

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

              // if(index && jQuery(this).data("fid") != fid && jQuery(this).data("fid") != "-1") {
              //   jQuery(this).remove();
              //   return false;
              // }
            });
          } else {
            jQuery(breadcrumb(fid, fname)).insertAfter(".breadcrumb-item:last");
          }
        };

        const updateItemList = (fid, page) => {
          var url =
            location.hostname == "localhost"
              ? "https://5d5eeb2c-b0b5-4b6b-b52e-0d009d067b36.mock.pstmn.io/v2/folders/home"
              : "https://create.figlinq.com/v2/folders/" +
                figlinqUserId +
                ":" +
                fid +
                "?page=" +
                page +
                "&filetype=plot&filetype=fold&order_by=filename";

          var withCredentials = location.hostname == "localhost" ? false : true;

          jQuery
            .ajax({
              url: url,
              xhrFields: {
                withCredentials: withCredentials
              }
            })
            .done(function(data) {
              var dataJSON = typeof data !== "object" ? JSON.parse(data) : data;
              var results = dataJSON.children.results;

              results.forEach(result => {
                const currentFid = result.fid.includes(":")
                  ? result.fid.substring(result.fid.indexOf(":") + 1)
                  : result.fid;
                if (result.filetype === "fold" && !result.deleted) {
                  itemListFolder += folderItem(result.filename, currentFid);
                } else if (result.filetype === "plot" && !result.deleted) {
                  itemListChart += plotItem(result.filename, currentFid);
                }
              });
              if (dataJSON.children.next == null) {
                jQuery(".panel-list-item").remove();
                jQuery("#item_list_container").html(
                  itemListFolder + itemListChart
                );
                jQuery("#modal_add_chart").addClass("is-active");
              } else {
                page = page + 1;
                updateItemList(fid, page);
              }
            })
            .fail(function() {})
            .always(function() {});
        };

        jQuery(document).on("click", "#cancel_add_chart", () => {
          jQuery("#modal_add_chart").removeClass("is-active");
        });

        jQuery(document).on("click", ".plot-item", e => {
          const dataFid = jQuery(e.target)
            .data("fid")
            .toString();
          const fid = dataFid.includes(":")
            ? dataFid.substring(dataFid.indexOf(":") + 1)
            : dataFid;

          if (jQuery(e.target).hasClass("is-active")) {
            // jQuery(".plot-item").removeClass("is-active");
            jQuery(e.target).removeClass("is-active");
          } else {
            jQuery(e.target).addClass("is-active");
          }

          var activePresent = false;
          var activeList = [];
          jQuery(".plot-item").each(function(index) {
            if (jQuery(this).hasClass("is-active")) {
              activePresent = true;
              activeList.push(jQuery(this).data("fid"));
            }
          });
          if (activePresent) {
            jQuery("#confirm_add_chart").prop("disabled", false);
            jQuery("#confirm_add_chart").data("selectedFid", activeList);
            if (activeList.length > 1) {
              jQuery("#col_select").prop("disabled", false);
            } else {
              jQuery("#col_select").prop("disabled", true);
            }
          } else {
            jQuery("#confirm_add_chart").prop("disabled", true);
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
          itemListChart = "";
          updateItemList(fid, 1);
          jQuery("#confirm_add_chart").prop("disabled", true);
        });

        const importImage = (url, width = 0, height = 0, x, y) => {
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
        };

        jQuery(document).on("click", "#inter_switch", e => {
          var checked = jQuery("#inter_switch").is(":checked");
          if (checked) {
            const images = jQuery(".figlinq-image");

            var currentUrl, src, id, className, height, width, x, y, style;
            var newForeignObj, newBody, newIframe, newG;

            images.each(function() {
              currentUrl = jQuery(this).attr("xlink:href");
              src = currentUrl.replace(".svg", ".embed");
              height = jQuery(this).attr("height");
              width = jQuery(this).attr("width");
              x = jQuery(this).attr("x");
              y = jQuery(this).attr("y");
              id = jQuery(this).attr("id");
              className = jQuery(this).attr("className");
              style = jQuery(this).attr("style");

              newIframe = {
                element: "iframe",
                attr: {
                  x: x,
                  y: y,
                  width: width,
                  height: height,
                  id: id + "_iframe",
                  src: src
                }
              };

              newBody = {
                element: "body",
                attr: {
                  id: id + "_body",
                  xmlns: "http://www.w3.org/1999/xhtml"
                },
                children: [newIframe]
              };

              newForeignObj = {
                element: "foreignObject",
                attr: {
                  x: x,
                  y: y,
                  width: width,
                  height: height,
                  id: id + "_fobject"
                },
                children: [newBody]
              };

              svgCanvas.addSVGElementFromJson(newForeignObj);
              this.remove();
              
              // Ugly hack, but works!
              var str = svgCanvas.getSvgString();
              str = str.replace('BODY', 'body');
              str = str.replace('IFRAME', 'iframe');
              svgEditor.loadSvgString(str);

            });
          } else {
            const fObjects = jQuery("foreignObject[id$=_fobject]");
            fObjects.each(function() {
              var url, height, width, x, y;
              
              url = jQuery(this).find("iframe").attr("src");
              url = url.replace(".embed", ".svg");
              height = jQuery(this).attr("height");
              width = jQuery(this).attr("width");
              x = jQuery(this).attr("x");
              y = jQuery(this).attr("y");

              this.remove();

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
                },
              });
              newImage.setAttributeNS(NS.XLINK, "xlink:href", url);
            });
          }
        });

        jQuery(document).on("click", "#confirm_add_chart", e => {
          jQuery(e.target).addClass("is-loading");
          const selectedFids = jQuery(e.target).data("selectedFid");

          var x = 0,
            y = 0,
            colNumber = jQuery("#col_select").val(),
            curCol = 1;

          selectedFids.forEach(selectedFid => {
            var imgDataUrl =
              location.hostname == "localhost"
                ? "https://da6da301-9466-42ab-8b66-50ca1b2dc96b.mock.pstmn.io/plotinfo"
                : "https://create.figlinq.com/v2/plots/" +
                  figlinqUserId +
                  ":" +
                  selectedFid;
            var withCredentials =
              location.hostname == "localhost" ? false : true;

            const importUrl =
              "https://create.figlinq.com/~" +
              figlinqUserId +
              "/" +
              selectedFid +
              ".svg";

            jQuery
              .ajax({
                url: imgDataUrl,
                // async: false,
                xhrFields: {
                  withCredentials: withCredentials
                }
              })
              .done(function(data) {
                var dataJSON =
                  typeof data !== "object" ? JSON.parse(data) : data;
                var width = dataJSON.figure.layout.width
                  ? dataJSON.figure.layout.width
                  : 400;
                var height = dataJSON.figure.layout.height
                  ? dataJSON.figure.layout.height
                  : 400;
                importImage(importUrl, width, height, x, y);
                x += width;
                curCol += 1;
                if (curCol > colNumber) {
                  curCol = 1;
                  y += height;
                  x = 0;
                }
                jQuery(e.target).removeClass("is-loading");
                jQuery("#modal_add_chart").removeClass("is-active");
              });
          });
        });

        jQuery(document).on("click", "#add_chart", () => {
          var lastFid = jQuery("#modal_add_chart").data("lastFid");
          if (lastFid) {
            jQuery("#modal_add_chart").addClass("is-active");
          } else {
            var fid = "-1";
            jQuery("#modal_add_chart").data("lastFid", fid);
            itemListFolder = "";
            itemListChart = "";
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
