import testData from "./testData";
import {folderItem, plotItem, parentItem} from "./elements";
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

        // Get user ID 
        var urlInit = location.hostname == "localhost" ?
        "https://755a6c50-f66a-452b-8141-90ea5218e958.mock.pstmn.io/users/current" :
        "https://create.figlinq.com/v2/users/current";
        var withCredentials = location.hostname == "localhost" ? false: true;
        
        jQuery.ajax({
          url: urlInit,
          xhrFields: {
            withCredentials: withCredentials
        }})
          .done(function(data) {
            var dataJSON = typeof data !== 'object' ? JSON.parse(data) : data;
            if(dataJSON.username != ""){
              jQuery("#add_chart").removeClass("is-hidden");
              jQuery("#log_in").addClass("is-hidden");
              jQuery("#sign_up").addClass("is-hidden");
              jQuery("#modal_add_chart").data("owner", dataJSON.username);
            }
          });

        const updateItemList = (fid, ownerId) => {

          var url = location.hostname == "localhost" ?
            "https://5d5eeb2c-b0b5-4b6b-b52e-0d009d067b36.mock.pstmn.io/v2/folders/home" :
            "https://create.figlinq.com/v2/folders/" + ownerId + ":" + fid;
            var withCredentials = location.hostname == "localhost" ? false: true;

          jQuery.ajax({
            url: url,
            xhrFields: {
              withCredentials: withCredentials
           }})
          .done(function(data) {
            var dataJSON = typeof data !== 'object' ? JSON.parse(data) : data;
            var children = dataJSON.children.results;
            var itemlist = dataJSON.parent == "-2" ? "" : parentItem(dataJSON.parent);

            children.forEach((child) => {
              if(child.filetype === 'fold'){
                itemlist += folderItem(child.filename, child.fid, child.parent);
              } else if (child.filetype === 'plot'){
                itemlist += plotItem(child.filename, child.fid);
              }
            })

            jQuery( ".panel-list-item" ).remove();
            jQuery( itemlist ).insertAfter( "#panel_tabs" );
            jQuery("#modal_add_chart").addClass("is-active");
          })
          .fail(function() {})
          .always(function() {});
        }

        jQuery(document).on("click", "#cancel_add_chart", () => {
          jQuery("#modal_add_chart").removeClass("is-active");
        });

        jQuery(document).on("click", ".plot-item", (e) => {
          const dataFid = jQuery(e.target).data("fid").toString();
          const fid = dataFid.includes(":") ? dataFid.substring(dataFid.indexOf(':') + 1) : dataFid;
          jQuery(".plot-item").removeClass("is-active");
          jQuery(e.target).addClass("is-active");
          jQuery("#confirm_add_chart").prop( "disabled", false );
          jQuery("#confirm_add_chart").data("selectedFid", fid);
        });

        jQuery(document).on("click", ".folder-item", (e) => {
          const dataFid = jQuery(e.target).data("fid").toString();
          const fid = dataFid.includes(":") ? dataFid.substring(dataFid.indexOf(':') + 1) : dataFid;
          const owner = jQuery("#modal_add_chart").data("owner");
          jQuery("#modal_add_chart").data("lastFid", fid);
          updateItemList(fid, owner);
          jQuery("#confirm_add_chart").prop( "disabled", true );
        });

        const importImage = (url, width = 0, height = 0) => {
          const newImage = svgEditor.svgCanvas.addSVGElementFromJson({
            element: 'image',
            attr: {
              x: 0,
              y: 0,
              width: width,
              height: height,
              id: svgEditor.svgCanvas.getNextId(),
              style: 'pointer-events:inherit'
            }
          });
          svgEditor.svgCanvas.clearSelection();
          svgEditor.svgCanvas.addToSelection([ newImage ]);
          svgEditor.svgCanvas.setImageURL(url);
        };
        
        jQuery(document).on("click", "#confirm_add_chart", (e) => {
          jQuery(e.target).addClass("is-loading");
          const selectedFid = jQuery(e.target).data("selectedFid");
          const ownerId = jQuery("#modal_add_chart").data("owner");
         
          var imgDataUrl = location.hostname == "localhost" ?
            "https://da6da301-9466-42ab-8b66-50ca1b2dc96b.mock.pstmn.io/plotinfo" :
            "https://create.figlinq.com/v2/plots/" + ownerId + ":" + selectedFid;
          var withCredentials = location.hostname == "localhost" ? false: true;
            
          const importUrl = "https://create.figlinq.com/~" + ownerId + "/" + selectedFid + ".svg";
          
          jQuery.ajax({
            url: imgDataUrl,
            xhrFields: {
              withCredentials: withCredentials
            },
          })
            .done(function(data) {
              var dataJSON = typeof data !== 'object' ? JSON.parse(data) : data;
              var width = dataJSON.figure.layout.width;
              var height = dataJSON.figure.layout.height;
              importImage(importUrl, width, height);
              jQuery(e.target).removeClass("is-loading");
              jQuery("#modal_add_chart").removeClass("is-active");
            });
  

        });

        jQuery(document).on("click", "#add_chart", () => {          
          const owner = jQuery("#modal_add_chart").data("owner");
          var lastFid = jQuery("#modal_add_chart").data("lastFid");
          if(lastFid){
            jQuery("#modal_add_chart").addClass("is-active");
          } else {
            const fid = "-1";
            jQuery("#modal_add_chart").data("lastFid", fid);
            updateItemList(fid, owner);
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
