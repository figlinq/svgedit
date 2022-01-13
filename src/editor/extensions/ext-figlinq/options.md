| Property | Description | Default | Preference | 
|:-------------|:----------------|:------------|:---------------|
| lang | Two-letter language code. The language must exist in the Editor Preferences language list | Default to "en" if locale.js detection does not detect another language | Yes |
| bkgd_url | Background raster image URL. This image will fill the background of the document, useful for tracing purposes | (none) | Yes |
| img_save | Defines whether included raster images should be saved as Data URIs when possible, or as URL references. Must be either 'embed' or 'ref'. Settable in the Document Properties dialog. | embed | Yes |
| dimensions | The default width/height of a new document. Use an array in setConfig (i.e. [800, 600]) and comma separated numbers in the URL | [640, 480] | Maybe |
| initFill[color] | The initial fill color. Must be a hex code string. | FF0000 (solid red) | No |
| initFill[opacity] | The initial fill opacity. Must be a number between 0 and 1 | 1 | No |
| initStroke[color] | The initial stroke color. Must be a hex code. | 000000 (solid black) | No |
| initStroke[width] | The initial stroke width. Must be a positive number. | 5 | No |
| initStroke[opacity] | The initial stroke opacity. Must be a number between 0 and 1 | 1 | No |
| initTool | The initially selected tool. Must be either the ID of the button for the tool, or the ID without "tool_" prefix_| select | No |
| exportWindowType | New as of 2.8. Can be "new" or "same" to indicate whether new windows will be generated for each export; the window.name of the export window is namespaced based on the canvasName (and incremented if "new" is selected as the type) | new | No |
| imgPath | The path where the SVG icons are located, with trailing slash. Note that as of version 2.7, this is not configurable by URL for security reasons. | images/ | No |
| jGraduatePath | The path where jGraduate images are located. Note that as of version 2.7, this is not configurable by URL for security reasons. | jgraduate/images/ | No |
| langPath | The path where the language files are located, with trailing slash. Note that as of version 2.7, this is not configurable by URL for security reasons. | locale/ | No |
| extPath | The path used for extension files, with trailing slash. Note that as of version 2.7, this is not configurable by URL for security reasons. | extensions/ | No |
| extensions | Extensions to load on startup. Use an array in setConfig and comma separated file names in the URL. Note that as of version 2.7, paths containing "/", "\", or ":", are disallowed for security reasons. Although previous versions of this list would entirely override the default list, as of version 2.7, the defaults will always be added to this explicit list unless the configuration "noDefaultExtensions" is included. | ['ext-overview_window.js','ext-markers.js','ext-connector.js','ext-eyedropper.js','ext-shapes.js','ext-imagelib.js','ext-grid.js','ext-polygon.js','ext-star.js','ext-panning.js','ext-storage.js'] | No |
| showlayers | Open the layers side-panel by default | false | No |
| wireframe | Start in wireframe mode | false | No |
| gridSnapping | Enable snap to grid by default. Set in Editor Options. | false | Maybe |
| gridColor | Set in Editor Options. | #000 (black) | Maybe |
| baseUnit | Set in Editor Options. | px | Maybe |
| snappingStep | Set the default grid snapping value. Set in Editor Options. | 10 | Maybe |
| showRulers | Initial state of ruler display (v2.6). Set in Editor Options. | true | Maybe |
| no_save_warning | A boolean that when true prevents the warning dialog box from appearing when closing/reloading the page. Mostly useful for testing. | false | No |
| canvas_expansion | The minimum area visible outside the canvas, as a multiple of the image dimensions. The larger the number, the more one can scroll outside the canvas. | 3 | No |
| show_outside_canvas | A boolean that defines whether or not elements outside the canvas should be visible; set by svgcanvas.js | true | No |
| iconsize | Size of the toolbar icons. Must be one of the following: 's', 'm', 'l', 'xl' | Will default to 's' if the window height is smaller than the minimum height and 'm' otherwise | Yes |
| bkgd_color | Canvas background color | #FFF (white) | Yes |
| selectNew | Initial state of option to automatically select objects after they are created (v2.6) | true | No |
| save_notice_done | Used to track alert status | false | Yes |
| export_notice_done | Used to track alert status | false | Yes |
| allowedOrigins | Used by ext-xdomain-messaging.js to indicate which origins are permitted for cross-domain messaging (e.g., between the embedded editor and main editor code). Besides explicit domains, one might add '' to allow all domains (not recommended for privacy/data integrity of your user's content !), window.location.origin for allowing the same origin (should be safe if you trust all apps on your domain), 'null' to allow file:// URL usage| [] | Maybe |
| canvasName | Used to namespace storage provided via ext-storage.js; you can use this if you wish to have multiple independent instances of SVG Edit on the same domain | default | No |
| initOpacity | Initial opacity (multiplied by 100) | 1 | No |
| colorPickerCSS | Object of CSS properties mapped to values (for jQuery) to apply to the color picker. A null value (the default) will cause the CSS to default to 'left' with a position equal to that of the fill_color or stroke_color element minus 140, and a 'bottom' equal to 40 | null (see description) | No |
| preventAllURLConfig | Set to true (in config.js; extension loading is too late!) to override the ability for URLs to set non-content configuration (including extension config) | false | No |
| preventURLContentLoading | Set to true (in config.js; extension loading is too late!) to override the ability for URLs to set URL-based SVG content | false | No |
| lockExtensions | Set to true (in config.js; extension loading is too late!) to override the ability for URLs to set their own extensions; disallowed in URL setting. There is no need for this when "preventAllURLConfig" is used. | false | No |
| noDefaultExtensions | If set to true, prohibits automatic inclusion of default extensions (though "extensions" can still be used to add back any desired default extensions along with any other extensions); can only be meaningfully used in config.js or in the URL | false | No |
| showGrid | Set by ext-grid.js; determines whether or not to show the grid by default | false | No |
| noStorageOnLoad | Some interaction with ext-storage.js; prevents even the loading of previously saved local storage | false | No |
| forceStorage | Some interaction with ext-storage.js; strongly discouraged from modification as it bypasses user privacy by preventing them from choosing whether to keep local storage or not | false | No |
| emptyStorageOnDecline | Used by ext-storage.js; empty any prior storage if the user declines to store | false | No |
| paramurl | This is available via URL only. Deprecated and removed in trunk. Allowed an un-encoded URL within the query string (use "url" or "source" with a data: URI instead) | (None) | No |
| selectNew | Set by svgcanvas.js; used by mouseUp; it true, will replace the selection with the current element and show grips | true | No |

