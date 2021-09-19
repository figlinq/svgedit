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
        
        const updateItemList = (fid, ownerId) => {
          jQuery.ajax("https://create.figlinq.com/v2/folders/" + ownerId + ":" + fid )
          .done(function(data) {
            var dataJSON = JSON.parse(data);
            console.log(dataJSON);
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
          jQuery(".plot-item").removeClass("is-active");
          jQuery(e.target).addClass("is-active");
          jQuery("#confirm_add_chart").prop( "disabled", false );
        });

        jQuery(document).on("click", ".folder-item", (e) => {
          const dataFid = jQuery(e.target).data("fid").toString();
          const fid = dataFid.includes(":") ? dataFid.substring(dataFid.indexOf(':') + 1) : dataFid;
          const owner = jQuery("#modal_add_chart").data("owner");
          updateItemList(fid, owner);
          jQuery("#confirm_add_chart").prop( "disabled", true );
        });

        jQuery(document).on("click", "#add_chart", () => {          

          // jQuery.ajax( "https://5d5eeb2c-b0b5-4b6b-b52e-0d009d067b36.mock.pstmn.io/v2/folders/home" )
          jQuery.ajax( "https://create.figlinq.com/v2/folders/home" )
            .done(function(data) {

              var dataJSON = JSON.parse(data);
              jQuery("#modal_add_chart").data("owner", dataJSON.owner);
              var itemlist = "";              
              var children = dataJSON.children.results;

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
            .fail(function() {

            })
            .always(function() {
              // alert( "complete" );
            });


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
