/* eslint-disable no-loop-func */
/* eslint-disable no-undef */
/* eslint-disable consistent-return */
/* eslint-disable no-use-before-define */
/* eslint-disable no-invalid-this */
/* global bulmaToast PDFDocument SVGtoPDF Draggable */
/*
TODO
1. Limit movement of elements after initial selection in event.js, line 130

*/

import { folderItem, plotItem, imageItem, figureItem, breadcrumb } from './elements'
import { NS } from './namespaces.js'
import { isValidUnit } from '../../../common/units.js'
import * as hstry from '../../../svgcanvas/history'

const { InsertElementCommand, BatchCommand } = hstry

// Cookies
function createCookie (name, value, days) {
  let expires
  if (days) {
    const date = new Date()
    const h = 24; const m = 60; const s = 60; const ms = 1000
    date.setTime(date.getTime() + (days * h * m * s * ms))
    expires = '; expires=' + date.toGMTString()
  } else {
    expires = ''
  }

  document.cookie = name + '=' + value + expires + '; path=/'
}

function readCookie (name) {
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') { c = c.substring(1, c.length) };
    if (c.indexOf(nameEQ) === 0) { return c.substring(nameEQ.length, c.length) };
  }
  return null
}

function eraseCookie (name) {
  createCookie(name, '', -1)
}

/**
 * @file ext-figlinq.js
 * @license MIT
 * @copyright 2021 figlinq.com
 */

const name = 'figlinq'
const baseUrl = 'https://' + location.hostname + '/'

export default {
  name,
  async init () {
    const svgEditor = this
    const { svgCanvas } = svgEditor
    return {
      name: svgEditor.i18next.t(`${name}:name`),
      callback () {
        jQuery(document).keydown(function (e) {
          // Ctrl + z (undo)
          const zKeyCode = 90
          const yKeyCode = 89
          if (
            e.originalEvent.ctrlKey &&
              !e.originalEvent.shiftKey &&
              e.originalEvent.keyCode === zKeyCode
          ) {
            clickUndo()
          } else if ( // Ctrl + Shift + z (redo)
            e.originalEvent.ctrlKey &&
              e.originalEvent.shiftKey &&
              e.originalEvent.keyCode === zKeyCode
          ) {
            clickRedo()
          } else if (e.originalEvent.ctrlKey && e.originalEvent.keyCode === yKeyCode) { // Ctrl + y (redo)
            clickRedo()
          }
        })

        jQuery(window).bind('mousewheel DOMMouseScroll', function (event) {
          let r = true
          if (event.ctrlKey === true) {
            event.preventDefault()
            showZoomWarning()
            r = false
          }
          return r
        })

        jQuery('.modal').bind('mousewheel DOMMouseScroll', function (event) {
          let r = true
          if (event.ctrlKey === true) {
            event.preventDefault()
            r = false
          }
          return r
        })

        // Initiate global vars
        let fqItemListFolder
        let fqItemListFile
        let fqItemListPreselected = false
        let fqUsername
        let fqCurrentFigData = false
        let fqModalMode
        let fqModalFileTabMode = 'my'
        let fqCsrfToken
        let fqSelectedFolderId = {
          my: false,
          shared: false,
          preselected: false
        }
        let fqHighlightedFids = false
        let fqExportDocType
        let fqExportDocQuality
        let fqExportDocSize
        let fqExportDocFname
        let fqExportMode
        let _typeMap
        let fqToolsTopHeight = false
        // const svgAttrWhitelist = ['class', 'height', 'width', 'x', 'y', 'id']
        const fqDefaultMargins = {
          // in mm
          left: 15,
          top: 15,
          right: 15,
          bottom: 15
        }

        const fqDefaultSpacing = {
          // in mm
          horizontal: 5,
          vertical: 10
        }

        const fqThumbWidth = 1200
        const cookieExpiryDays = 365
        const fqPdfPageSizes = {
          A0: '2383.94x3370.39',
          A1: '1683.78x2383.94',
          A2: '1190.55x1683.78',
          A3: '841.89x1190.55',
          A4: '595.28x841.89',
          A5: '419.53x595.28',
          Letter: '612.00x792.00'
        }
        const fqExportFileFormats = {
          '1x (current)': 1,
          '2x': 2,
          '3x': 3,
          '4x': 4,
          '6x': 6,
          '8x': 8
        }
        const NSSVG = 'http://www.w3.org/2000/svg'
        const alphabet = [
          'A',
          'B',
          'C',
          'D',
          'E',
          'F',
          'G',
          'H',
          'I',
          'J',
          'K',
          'L',
          'M',
          'N',
          'O',
          'P',
          'Q',
          'R',
          'S',
          'T',
          'U',
          'V',
          'W',
          'X',
          'Y',
          'Z'
        ]
        const fqFontRoundPrecision = 2
        const fqAlignRoundPrecision = 3

        const setDeep = function (obj, path, value, setrecursively = false) {
          path.reduce((a, b, level) => {
            if (setrecursively && typeof a[b] === 'undefined' && level !== path.length) {
              a[b] = {}
              return a[b]
            }

            if (level === path.length - 1) {
              a[b] = value
              return value
            }
            return a[b]
          }, obj)
        }

        // To use this function we need to get content_type field into the "children" object returned from v2
        // const getExt = (contentType) => {
        //   if (contentType === "image/jpeg" || contentType === "image/jpg") return "jpg"
        //   if (contentType === "image/svg" || contentType === "image/svg+xml") return "svg"
        //   if (contentType === "image/png") return "png"
        //   if (contentType === "image/bmp") return "bmp"
        //   if (contentType === "image/gif") return "gif"
        // }

        // Replace the broken zoom functionality in v7
        const upgradeUi = () => {
          // Replace zoom button
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
          </div>`
          jQuery('#zoom').replaceWith(element)

          // Hide image URL input and other elements
          jQuery('#image_url').hide()
          jQuery('#elem_id').hide()
          jQuery('#elem_class').hide()
          jQuery('#tool_length_adjust').hide()
          jQuery('#editor_panel').hide()

          // Hide image URL input
          jQuery(jQuery(jQuery('#stroke_linecap')[0].shadowRoot).find('elix-dropdown-list')[0].shadowRoot).find('#popupToggle').hide()
          jQuery(jQuery(jQuery('#stroke_linejoin')[0].shadowRoot).find('elix-dropdown-list')[0].shadowRoot).find('#popupToggle').hide()
          jQuery(jQuery(jQuery('#tool_position')[0].shadowRoot).find('elix-dropdown-list')[0].shadowRoot).find('#popupToggle').hide()
          jQuery(jQuery(jQuery('#tool_text_anchor')[0].shadowRoot).find('elix-dropdown-list')[0].shadowRoot).find('#popupToggle').hide()
          jQuery(jQuery(jQuery('#start_marker_list_opts')[0].shadowRoot).find('elix-dropdown-list')[0].shadowRoot).find('#popupToggle').hide()
          jQuery(jQuery(jQuery('#mid_marker_list_opts')[0].shadowRoot).find('elix-dropdown-list')[0].shadowRoot).find('#popupToggle').hide()
          jQuery(jQuery(jQuery('#end_marker_list_opts')[0].shadowRoot).find('elix-dropdown-list')[0].shadowRoot).find('#popupToggle').hide()
        }

        // Fitting to content does not work
        // <option value="layer">Fit to layer content</option>
        // <option value="content">Fit to all content</option>

        const showZoomWarning = () => {
          const delay = 1250
          jQuery('#fq-modal-warning-zoom').addClass('is-active')
          setTimeout(function () {
            jQuery('#fq-modal-warning-zoom').removeClass('is-active')
          }, delay)
        }

        const getFqUsername = () => {
          $.ajax({
            url: baseUrl + 'v2/users/current',
            xhrFields: { withCredentials: true }
          })
            .done(function (data) {
              if (data.username) {
                jQuery('#fq-menu-login-btn').addClass('is-hidden')
                jQuery('#fq-menu-signup-btn').addClass('is-hidden')
                jQuery('.fq-menu-add-content-btn').removeClass('is-hidden')
                jQuery('#fq-menu-interact-switch-item').removeClass('is-hidden')
                jQuery('#fq-menu-file-open-figure').removeClass('is-hidden')
                jQuery('#fq-menu-file-save-figure').removeClass('is-hidden')
                jQuery('#fq-menu-file-save-figure-as').removeClass('is-hidden')
                jQuery('#fq-menu-file-import-local-content').removeClass('is-hidden')
                jQuery('#fq-breadcrumb-item-home')
                  .data('fid', `${data.username}:-1`)
                  .find('.fq-modal-folder-item')
                  .data('fid', `${data.username}:-1`)

                fqUsername = data.username
                jQuery('#fq-menu-account-user-name').html(fqUsername.slice(0, 2))
                jQuery('#fq-menu-account-dropdown-user-name').html(fqUsername)
                jQuery('#fq-menu-account-navbar-item1').removeClass('is-hidden')
                jQuery('#fq-menu-account-navbar-item2').removeClass('is-hidden')

                jQuery('#fq-user-link-files').attr('href', baseUrl + 'organize/home')
                jQuery('#fq-user-link-charts').attr('href', baseUrl + 'create')
                jQuery('#fq-user-link-figures').attr('href', baseUrl + 'figures')
                jQuery('#fq-user-link-collections').attr('href', baseUrl + 'dashboard/create')

                jQuery('#fq-menu-account-sign-out').attr('href', baseUrl + 'signout')
                jQuery('#fq-menu-account-settings').attr('href', baseUrl + 'settings/profile')

                fqCsrfToken = data.csrf_token
              } else {
                showToast(
                  'It looks like you are not logged in to FiglinQ in this browser!',
                  'is-danger'
                )
              }
            })
            .fail(function () {
              jQuery('#fq-menu-login-btn').removeClass('is-hidden')
              jQuery('#fq-menu-signup-btn').removeClass('is-hidden')
              jQuery('.fq-menu-add-content-btn').addClass('is-hidden')
              jQuery('.fq-menu-add-content-btn').addClass('is-hidden')
              jQuery('.fq-menu-add-content-btn').addClass('is-hidden')
              jQuery('.fq-menu-add-content-btn').addClass('is-hidden')
              showToast('Could not connect to FiglinQ - are you logged in?', 'is-danger')
            })
        }

        const setInteractiveOff = () => {
          jQuery('#fq-menu-interact-switch').prop('checked', false)
          const fObjects = jQuery("svg[class='fq-fobj-container']")
          fObjects.each(function () {
            const refId = jQuery(this).data('ref_id')
            jQuery('#' + refId).attr('visibility', 'visible')
            this.remove()
          })
        }

        const setInteractiveOn = async () => {
          svgCanvas.clearSelection()

          // Get all plots
          const plots = jQuery('.fq-plot')

          let plot, foreignObject
          plots.each(function () {
            plot = jQuery(this)

            // Generate foreignObject JSON
            foreignObject = generateForeignObject(plot)

            // Add to canvas
            svgCanvas.addSVGElementsFromJson(foreignObject)

            // Hide the plot image
            this.setAttribute('visibility', 'hidden')
          })
        }

        const updateBreadcrumb = (fid, fname) => {
          let fidPresent = false
          jQuery('.breadcrumb-item').each(function () {
            if (jQuery(this).data('fid') === fid) {
              fidPresent = true
            }
          })

          if (fidPresent) {
            jQuery(
              jQuery('.breadcrumb-item')
                .get()
                .reverse()
            ).each(function () {
              let r = true
              if (jQuery(this).data('fid') === fid) {
                r = false
              } else {
                jQuery(this).remove()
              }
              return r
            })
          } else if (fname) {
            jQuery(breadcrumb(fid, fname)).insertAfter('.breadcrumb-item:last')
          } else {
            jQuery('.breadcrumb-item:not(#fq-breadcrumb-item-home)').remove()
          }
        }

        const getSortedElems = (selector, attrName) => {
          return jQuery(
            jQuery(selector)
              .toArray()
              .sort((a, b) => {
                const aVal = parseInt(a.getAttribute(attrName), 10)
                const bVal = parseInt(b.getAttribute(attrName), 10)
                return aVal - bVal
              })
          )
        }

        const getUrlParameter = function getUrlParameter (sParam) {
          const sPageURL = window.location.search.substring(1)
          const sURLVariables = sPageURL.split('&')
          let sParameterName, i

          for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=')

            if (sParameterName[0] === sParam) {
              return typeof sParameterName[1] === 'undefined'
                ? true
                : decodeURIComponent(sParameterName[1])
            }
          }
          return false
        }

        /**
           * Loads figure from url or opens content add modal
           * @returns {void}
           */
        const loadFqFigure = () => {
          // First try to load figure from URL fid
          const fid = getUrlParameter('fid')
          const add = getUrlParameter('add')
          if (fid) {
            svgCanvas.clear()
            eraseCookie('figlinq-fid')
            openFigure({ data: { fid } })
          }

          // Load figure from cookie fid
          const cookieFid = readCookie('figlinq-fid')
          if (!fid && cookieFid && !add) {
            svgCanvas.clear()
            openFigure({ data: { fid: cookieFid } })
          }

          if (add) {
            // preload multiple files, open modal
            const fidArray = add.split(',')
            const checked = jQuery('#fq-menu-interact-switch').is(':checked')
            if (checked) {
              jQuery('#fq-menu-interact-switch').click()
            }
            fqModalFileTabMode = 'preselected'
            showModalSpinner()
            prepareFileModal('addFiglinqPreselectedContent')
            refreshModalContents(fidArray)
            window.history.replaceState({}, document.location, '/figures/')
          }
        }

        const parseFid = (dataFid, index = 1) => {
          if (!dataFid || !dataFid.includes(':')) {
            return false
          }
          return dataFid.split(':')[index]
        }

        const getFileDataFromFiglinQ = (fid, endpoint = 'files') => {
          const url = `${baseUrl}v2/${endpoint}/${fid}`
          return new Promise(resolve => {
            $.ajax({
              url,
              xhrFields: {
                withCredentials: true
              }
            })
              .done(function (data) {
                resolve(data)
              })
              .fail(function (error) {
                resolve({
                  fid,
                  error: error.responseJSON.detail
                })
              })
          })
        }

        const getPlotDataFromFiglinQ = fid => {
          const plotUrl = `${baseUrl}v2/plots/${fid}/content`
          return new Promise(resolve => {
            $.ajax({
              url: plotUrl,
              xhrFields: {
                withCredentials: true
              }
            })
              .done(function (data) {
                resolve(data)
              })
              .fail(function (error) {
                resolve({
                  fid,
                  error: error.responseJSON.detail
                })
              })
          })
        }

        const updateItemList = (dataFid, page, searchQuery = false) => {
          if (Array.isArray(dataFid)) {
            // Get data for each file
            const elementProps = []
            dataFid.forEach(fid => {
              elementProps.push({
                fid,
                endpoint: 'files'
              })
            })
            const actions = elementProps.map(function (prop) {
              return getFileDataFromFiglinQ(prop.fid, prop.endpoint)
            })
            const results = Promise.all(actions) // pass array of promises
            results.then(data => {
              const dataFormatted = {
                children: {
                  results: data,
                  next: null
                }
              }
              fqItemListPreselected = {
                data: dataFormatted,
                fids: dataFid
              }
              jQuery('.fq-modal-file-tab').removeClass('is-active')
              jQuery('#fq-modal-file-tab-preselected').removeClass('is-hidden')
              jQuery('#fq-modal-file-tab-preselected').addClass('is-active')
              populateFileModal(dataFormatted)
            })
            return
          }

          const fid = parseFid(dataFid)
          let url

          const myFileTypes =
              fqModalMode === 'upload'
                ? 'filetype=fold'
                : 'filetype=plot&filetype=fold&filetype=external_image'

          if (fqModalFileTabMode === 'my') {
            url = searchQuery
              ? `${baseUrl}v2/folders/all?s=${searchQuery}&filetype=plot&filetype=external_image&page_size=1000`
              : `${baseUrl}v2/folders/${dataFid}?page=${page}&${myFileTypes}&order_by=filename&page_size=1000`
          } else if (fqModalFileTabMode === 'shared') {
            if (fid === -1) {
              url = `${baseUrl}v2/folders/shared?filetype=fold&filetype=plot&filetype=external_image&order_by=filename&page_size=1000`
            } else {
              url = `${baseUrl}v2/folders/${dataFid}?page=${page}&filetype=fold&filetype=plot&filetype=external_image&order_by=filename&page_size=1000`
            }
          }

          $.ajax({
            url,
            xhrFields: {
              withCredentials: true
            }
          })
            .done(populateFileModal)
            .fail(function () {
              showToast('Communication error, file list has not been updated', 'is-danger')
            })
            .always(function () {})
        }

        // const resetPlotImageUrls = () => {
        //   const plotImages = jQuery('.fq-plot')
        //   plotImages.each(function() {
        //     const href = jQuery(this).attr('href')
        //     const hrefCleaned = href.split('#')[0]
        //     jQuery(this).attr('href', hrefCleaned)
        //   })
        // }

        const populateFileModal = data => {
          jQuery('#fq-modal-files-open-figure-confirm').prop('disabled', true)
          const val = jQuery('#fq-modal-save-name-input').val()
          if (val.length) {
            jQuery('#fq-modal-save-confirm-btn').prop('disabled', false)
          } else {
            jQuery('#fq-modal-save-confirm-btn').prop('disabled', true)
          }
          let index = 0
          let page = 1
          const results = data.children.results
          results.forEach(result => {
            const isFigure = 'svgedit' in (result.metadata || {})
            const includeNonSvg = fqModalMode === 'addContent' || fqModalMode === 'upload'
            if (result.filetype === 'fold' && !result.deleted) {
              fqItemListFolder += folderItem(result.filename, result.fid)
            } else if (isFigure && result.filetype === 'external_image' && !result.deleted) {
              // TODO importing figures with external links into other figures is currently disabled, but could be enabled if they are inlined
              let haslinkedcontent = false
              if (
                fqModalMode === 'addContent' &&
                  typeof result?.metadata?.svgedit?.haslinkedcontent !== 'undefined' &&
                  result.metadata.svgedit.haslinkedcontent === true
              ) {
                haslinkedcontent = true
              }
              fqItemListFile += figureItem(result.filename, result.fid, index, haslinkedcontent)
              index += 1
            } else if (
              includeNonSvg &&
                !isFigure &&
                result.filetype === 'external_image' &&
                !result.deleted
            ) {
              fqItemListFile += imageItem(result.filename, result.fid, index)
              index += 1
            } else if (includeNonSvg && result.filetype === 'plot' && !result.deleted) {
              fqItemListFile += plotItem(result.filename, result.fid, index)
              index += 1
            } else if ('error' in result) {
              showToast(`Error loading file ${result.fid} - ${result.error}.`, 'is-danger')
            }
          })

          if (data.children.next === null) {
            jQuery('.panel-list-item').remove()
            jQuery('#fq-modal-item-list-container').html(fqItemListFolder + fqItemListFile)
            jQuery('#fq-modal-refresh-btn').removeClass('is-loading')
          } else {
            page = page + 1
            updateItemList(data.fid, page)
          }
          const items = results.length === 1 ? 'item' : 'items'
          jQuery('#fq-modal-file-search-items-found').text(results.length + ' ' + items + ' found')
          if (fqItemListPreselected && fqModalFileTabMode === 'preselected') {
            fqItemListPreselected.fids.forEach(fid => {
              const isDisabled = jQuery("*[data-fid='" + fid + "']").hasClass('is-disabled')
              if (!isDisabled) {
                jQuery("*[data-fid='" + fid + "']").addClass('is-active')
              }

              jQuery('#fq-modal-add-confirm-btn').prop('disabled', false)
            })
          }

          if (fqHighlightedFids) {
            fqHighlightedFids.forEach(fid => {
              jQuery("*[data-fid='" + fid + "']").addClass('is-active')
            })
            fqHighlightedFids = false
          }
          hideModalSpinner()
        }

        const getElementHref = (element) => {
          let href = jQuery(element).attr('href')
          if (typeof href === 'undefined' || href === false || href === null) {
            href = jQuery(element).attr('xlink:href')
          }
          return href
        }

        const generateForeignObject = currentImg => {
          const imgHref = getElementHref(currentImg)
          const contentHref = decodeURIComponent(currentImg.data('content_href'))

          const contentHrefGuess = imgHref.replace('.svg', '.embed')
          const iframeSrc = contentHref === null ? contentHrefGuess : contentHref

          const height = currentImg.height()
          const width = currentImg.width()
          const x = currentImg.attr('x')
          const y = currentImg.attr('y')
          const id = currentImg.attr('id')
          const originalDimensions = currentImg.data('original_dimensions').split(',')
          const fid = currentImg.data('fid')

          const newIframe = {
            element: 'iframe',
            namespace: NS.HTML,
            attr: {
              x: 0,
              y: 0,
              width: originalDimensions[0],
              height: originalDimensions[1],
              id: svgCanvas.getNextId(),
              src: iframeSrc,
              xmlns: NS.HTML,
              allow: 'fullscreen'
            }
          }

          const newBody = {
            element: 'body',
            namespace: NS.HTML,
            attr: {
              id: svgCanvas.getNextId(),
              xmlns: NS.HTML
            },
            children: [newIframe]
          }

          const newForeignObj = {
            element: 'foreignObject',
            namespace: NS.SVG,
            attr: {
              x: 0,
              y: 0,
              width: originalDimensions[0],
              height: originalDimensions[1],
              id: svgCanvas.getNextId(),
              xmlns: NS.SVG
            },
            children: [newBody]
          }

          const newSvg = {
            element: 'svg',
            namespace: NS.SVG,
            attr: {
              x,
              y,
              width,
              height,
              viewBox: `0 0 ${originalDimensions[0]} ${originalDimensions[1]}`,
              preserveAspectRatio: 'none',
              id: svgCanvas.getNextId(),
              class: 'fq-fobj-container',
              'data-ref_id': id,
              'data-fid': fid,
              xmlns: NS.SVG
            },
            children: [newForeignObj]
          }

          return newSvg
        }

        const placeTextElement = (attr, text = '') => {
          const _elem = {
            element: 'text',
            attr
          }

          const batchCmd = new BatchCommand('Insert text')
          const newElem = svgCanvas.addSVGElementsFromJson(_elem)
          newElem.textContent = text
          batchCmd.addSubCommand(new InsertElementCommand(newElem))
          svgCanvas.undoMgr.addCommandToHistory(batchCmd)
          svgCanvas.call('changed', [newElem])
        }

        const placeElement = imgProps => {
          const attr = {
            xmlns: NS.SVG,
            preserveAspectRatio: 'none',
            id: svgCanvas.getNextId(),
            style: 'pointer-events:inherit',
            class: 'fq-' + imgProps.filetype,
            'xlink:href': imgProps.imgHref,
            width: imgProps.width,
            height: imgProps.height,
            x: imgProps.x,
            y: imgProps.y,
            'data-original_dimensions': `${imgProps.widthOriginal},${imgProps.heightOriginal}`,
            'data-fid': imgProps.fid
          }

          if (imgProps.filetype === 'plot') {
            attr['data-content_href'] = imgProps.contentHref
          }

          const _img = {
            element: 'image',
            namespace: NS.SVG,
            attr
          }
          const batchCmd = new BatchCommand('Insert plot')
          const newElem = svgCanvas.addSVGElementsFromJson(_img)
          batchCmd.addSubCommand(new InsertElementCommand(newElem))
          svgCanvas.undoMgr.addCommandToHistory(batchCmd)
          svgCanvas.call('changed', [newElem])
        }

        const getSvgFromEditor = () => {
          svgCanvas.clearSelection()

          // Temporarily switch units to pixels for correct viewbox settings
          let revertUnit = false
          const initialUnit = svgEditor.configObj.curConfig.baseUnit
          if (initialUnit !== 'px') {
            revertUnit = true
            svgEditor.configObj.curConfig.baseUnit = 'px'
            svgCanvas.setConfig(svgEditor.configObj.curConfig)
            svgEditor.updateCanvas()
          }

          const saveOpts = {
            images: svgEditor.configObj.pref('img_save'),
            round_digits: 6,
            apply: true
          }
          const saveOptions = svgCanvas.mergeDeep(svgCanvas.getSvgOption(), saveOpts)
          for (const [key, value] of Object.entries(saveOptions)) {
            svgCanvas.setSvgOption(key, value)
          }

          const svg = '<?xml version="1.0"?>' + svgCanvas.svgCanvasToString()

          // Revert back to previous units
          if (initialUnit !== 'px' && revertUnit) {
            svgEditor.configObj.curConfig.baseUnit = initialUnit
            svgCanvas.setConfig(svgEditor.configObj.curConfig)
            svgEditor.updateCanvas()
          }
          return svg
        }

        const showToast = (msg, type) => {
          const short = 4000
          const long = 10000
          const duration = type === 'is-danger' ? long : short
          bulmaToast.toast({
            message: msg,
            type,
            position: 'bottom-right',
            closeOnClick: true,
            dismissible: true,
            duration
          })
        }

        const ensureRulesGrids = () => {
          const showGrid = svgEditor.configObj.curConfig.showGrid
          if (showGrid) {
            jQuery('#fq-menu-view-show-grid')
              .find('.material-icons')
              .text('check_box')
          } else {
            jQuery('#fq-menu-view-show-grid')
              .find('.material-icons')
              .text('check_box_outline_blank')
          }

          const showRulers = svgEditor.configObj.curConfig.showRulers
          if (showRulers) {
            jQuery('#fq-menu-view-show-rulers')
              .find('.material-icons')
              .text('check_box')
          } else {
            jQuery('#fq-menu-view-show-rulers')
              .find('.material-icons')
              .text('check_box_outline_blank')
          }
        }

        const closeModalOnEscape = e => {
          if (e.key === 'Escape') {
            jQuery('#fq-modal-file').removeClass('is-active')
            jQuery(document).unbind('keyup', closeModalOnEscape)
          }
        }

        const refreshModalContents = (fidArray = false) => {
          fqItemListFolder = ''
          fqItemListFile = ''
          jQuery('#fq-modal-file').addClass('is-active')
          jQuery(document).keyup(closeModalOnEscape)

          let q = jQuery('#fq-modal-file-search-input').val()
          if (q && fqModalFileTabMode === 'my') {
            jQuery('#fq-modal-file-search-icon').removeClass('fas fa-search')
            jQuery('#fq-modal-file-search-icon').addClass('far fa-times-circle')
          } else {
            jQuery('#fq-modal-file-search-icon').removeClass('far fa-times-circle')
            jQuery('#fq-modal-file-search-icon').addClass('fas fa-search')
          }

          q = q.length >= 2 ? q : false

          if (fidArray) {
            // Open specific fids in modal
            updateItemList(fidArray, 1, q)
          } else if (q && fqModalFileTabMode === 'my') {
            // Search query present, "My files" tab
            jQuery('#fq-modal-file-search-title').removeClass('is-hidden')
            jQuery('#fq-modal-file-panel-breadcrumb').addClass('is-hidden')
            updateItemList('shared', 1, q)
          } else {
            jQuery('#fq-modal-file-search-title').addClass('is-hidden')
            jQuery('#fq-modal-file-panel-breadcrumb').removeClass('is-hidden')

            if (fqSelectedFolderId[fqModalFileTabMode]) {
              updateItemList(fqSelectedFolderId[fqModalFileTabMode], 1)
            } else {
              fqSelectedFolderId[fqModalFileTabMode] =
                  fqModalFileTabMode === 'my' ? fqUsername + ':-1' : 'shared'
              updateItemList(fqSelectedFolderId[fqModalFileTabMode], 1)
            }
          }
          updateBreadcrumb(fqSelectedFolderId[fqModalFileTabMode], false)
        }

        const decodeBase64 = function (s) {
          const e = {}
          let i
          let b = 0
          let c; let x; let l = 0; let a; let r = ''
          const w = String.fromCharCode
          const L = s.length
          const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
          // eslint-disable-next-line no-magic-numbers
          for (i = 0; i < 64; i++) {
            e[A.charAt(i)] = i
          }
          for (x = 0; x < L; x++) {
            c = e[s.charAt(x)]
            // eslint-disable-next-line no-magic-numbers
            b = (b << 6) + c
            // eslint-disable-next-line no-magic-numbers
            l += 6
            // eslint-disable-next-line no-magic-numbers
            while (l >= 8) {
              // eslint-disable-next-line no-unused-expressions, no-magic-numbers
              ((a = (b >>> (l -= 8)) & 0xff) || x < L - 2) && (r += w(a))
            }
          }
          return r
        }

        const clickUndo = function () {
          const { undoMgr, textActions } = svgCanvas
          if (undoMgr.getUndoStackSize() > 0) {
            undoMgr.undo()
            svgEditor.layersPanel.populateLayers()
            if (svgEditor.svgCanvas.getMode() === 'textedit') {
              textActions.clear()
            }
          }
        }

        const clickRedo = function () {
          const { undoMgr } = svgCanvas
          if (undoMgr.getRedoStackSize() > 0) {
            undoMgr.redo()
            svgEditor.layersPanel.populateLayers()
          }
        }

        const onConfirmClear = async function () {
          jQuery('#fq-modal-confirm').removeClass('is-active')
          // Clear fid cookie
          eraseCookie('figlinq-fid')

          fqCurrentFigData = false

          const [x, y] = svgEditor.configObj.curConfig.dimensions
          svgEditor.leftPanel.clickSelect()
          svgEditor.svgCanvas.clear()
          svgEditor.svgCanvas.setResolution(x, y)
          svgEditor.updateCanvas(true)
          svgEditor.zoomImage()
          svgEditor.layersPanel.populateLayers()
          svgEditor.topPanel.updateContextPanel()
          svgEditor.svgCanvas.runExtensions('onNewDocument')
          const delay = 300
          setTimeout(function () {
            svgEditor.zoomChanged(window, 'canvas')
          }, delay)
        }

        const processSvgString = function (stringIn) {
          // Replace href attributes
          const doc = new DOMParser().parseFromString(stringIn, 'application/xml')
          const svg = jQuery(doc.documentElement)[0]
          const attr = jQuery(svg).attr('xmlns:xlink')
          if (typeof attr === 'undefined' || attr === false) {
            jQuery(svg).attr('xmlns:xlink', NS.XLINK)
          }
          jQuery(svg).find('image').each(async function () {
            const href = getElementHref(jQuery(this))
            jQuery(this).removeAttr('href')
            jQuery(this).attr('xlink:href', href)
          })
          const serializer = new XMLSerializer()
          return serializer.serializeToString(svg)
        }

        const openFigure = async function (e) {
          jQuery('#fq-load-indicator').show()
          const url = baseUrl + 'v2/external-images/' + e.data.fid

          $.ajax({
            url,
            xhrFields: { withCredentials: true }
          })
            .done(function (data) {
              if (
                !('image_content' in data) ||
                  (data.content_type !== 'image/svg' && data.content_type !== 'image/svg+xml')
              ) {
                showToast('This file type is not supported', 'is-danger')
                return
              }
              const dataUrl = data.image_content
              const svgString = decodeBase64(dataUrl.split(',')[1])
              const svgStringProcessed = processSvgString(svgString)
              svgEditor.loadSvgString(svgStringProcessed)
              jQuery('#fq-modal-confirm').removeClass('is-active')
              fqCurrentFigData = data
              if (
                typeof fqCurrentFigData.metadata === 'string' ||
                  fqCurrentFigData.metadata instanceof String
              ) {
                fqCurrentFigData.metadata = JSON.parse(fqCurrentFigData.metadata)
              }
              const delay = 300
              setTimeout(function () {
                svgEditor.zoomChanged(window, 'canvas')
                svgCanvas.undoMgr.resetUndoStack()
              }, delay)
              showToast('File "' + data.filename + '" loaded', 'is-success')

              // Add fid to cookie and remove from URL
              createCookie('figlinq-fid', data.fid, cookieExpiryDays)
              window.history.replaceState({}, document.location, '/figures/')

              jQuery('#fq-load-indicator').hide()
            })
            .fail(function () {
              showToast('This file could not be loaded', 'is-danger')
              jQuery('#fq-load-indicator').hide()
            })
        }

        const fetchImageBase64 = imgUrl => {
          return new Promise(resolve => {
            fetch(imgUrl, {
              method: 'GET',
              mode: 'cors',
              credentials: 'include',
              headers: {
                'X-CSRFToken': fqCsrfToken
              }
            })
              .then(response => response.json())
              .then(result => {
                fetch(result.thumbnail_url, {
                  method: 'GET',
                  mode: 'cors',
                  credentials: 'include',
                  headers: {
                    'X-CSRFToken': fqCsrfToken
                  }
                })
                  .then((res) => res.blob())
                  .then(blob => {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      resolve(reader.result)
                    }
                    reader.readAsDataURL(blob)
                  })
              })
          })
        }

        // const runImageThroughCanvas = input => {
        //   return new Promise(resolve => {
        //     const img = new Image()
        //     img.onload = function () {
        //       let canvas = document.createElement('CANVAS')
        //       const ctx = canvas.getContext('2d')
        //       canvas.height = img.height
        //       canvas.width = img.width
        //       ctx.drawImage(img, 0, 0, img.width, img.height)
        //       const dataURL = canvas.toDataURL()
        //       canvas = null
        //       resolve({ dataURL })
        //     }
        //     img.src = input
        //   })
        // }

        const fetchSvgString = imgUrl => {
          return new Promise(resolve => {
            fetch(imgUrl, {
              method: 'GET',
              mode: 'cors',
              credentials: 'include'
            })
              .then(response => response.text())
              .then(text => resolve(text))
          })
        }

        const svgToRaster = svgString => {
          return new Promise(resolve => {
            const canvas = document.getElementById('fq-canvas')
            const resolution = svgCanvas.getResolution()
            let w, h
            if (fqExportMode === 'thumb') {
              w = fqThumbWidth
              h = Math.round((resolution.h * fqThumbWidth) / resolution.w)
            } else {
              w = resolution.w * parseInt(fqExportDocSize, 10)
              h = resolution.h * parseInt(fqExportDocSize, 10)
            }

            canvas.width = w
            canvas.height = h
            const blob = new Blob([svgString], { type: 'image/svg+xml' })
            const win = window.URL || window.webkitURL || window
            const img = new Image()
            const url = win.createObjectURL(blob)

            img.onload = function () {
              const ctx = canvas.getContext('2d')

              if (fqExportDocType !== 'png') {
                ctx.fillStyle = 'white'
                ctx.fillRect(0, 0, w, h)
              }
              ctx.drawImage(img, 0, 0, w, h)
              win.revokeObjectURL(url)
              // If saving image/thumbnail to FiglinQ, return blob so that it can be added to form
              let uri
              if (fqExportMode === 'thumb') {
                canvas.toBlob(function (blob) {
                  resolve(blob)
                })
                return
              } else if (fqExportMode === 'download') {
                uri = canvas
                  .toDataURL('image/' + fqExportDocType, fqExportDocQuality)
                  .replace('image/' + fqExportDocType, 'octet/stream')
              }

              // Add link to download file
              const a = document.createElement('a')
              document.body.appendChild(a)
              a.style = 'display: none'
              a.href = uri
              a.download = fqExportDocFname + '.' + fqExportDocType
              a.click()
              window.URL.revokeObjectURL(uri)
              document.body.removeChild(a)
            }

            img.src = url
          })
        }

        const svgToPdf = svgString => {
          const docDimsStr = jQuery('#fq-modal-export-size-select').val()
          const docDims = docDimsStr.split('x')

          const doc = new PDFDocument({ size: fqExportDocSize })

          const chunks = []
          doc.pipe({
            // writable stream implementation
            write: chunk => chunks.push(chunk),
            end: () => {
              const pdfBlob = new Blob(chunks, {
                type: 'application/octet-stream'
              })
              const blobUrl = window.URL.createObjectURL(pdfBlob)

              const a = document.createElement('a')
              document.body.appendChild(a)
              a.style = 'display: none'
              a.href = blobUrl
              a.download = fqExportDocFname + '.pdf'
              a.click()
              window.URL.revokeObjectURL(blobUrl)
              document.body.removeChild(a)
            },
            // readable stream stub iplementation
            on: (_event, _action) => {},
            once: (..._args) => {},
            emit: (..._args) => {}
          })
          // eslint-disable-next-line new-cap
          SVGtoPDF(doc, svgString, 0, 0, {
            width: docDims[0],
            height: docDims[1],
            preserveAspectRatio: 'xMinYMin meet'
          })
          doc.end()
        }

        const updateExportFormSizeSelect = options => {
          jQuery('#fq-modal-export-size-select')
            .find('option')
            .remove()

          $.each(options, function (key, value) {
            jQuery('#fq-modal-export-size-select').append(
              jQuery('<option></option>')
                .attr('value', value)
                .text(key)
            )
          })
        }

        const activateDraggableModals = () => {
          // eslint-disable-next-line new-cap
          const draggable = new Draggable.default(
            document.querySelectorAll('.draggable-container'),
            {
              handle: '.drag-handle'
            }
          )
          draggable.on('drag:stop', data => {
            const pos = jQuery('.draggable-mirror').position()
            jQuery(data.originalSource).css({
              position: 'fixed',
              left: pos.left,
              top: pos.top
            })
          })
        }

        const updateExportFormState = () => {
          const format = jQuery('#fq-modal-export-format-select').val()
          if (format === 'jpeg') {
            jQuery('[id^="fq-modal-export-quality"]').prop('disabled', false)
            jQuery('[id^="fq-modal-export-size"]').prop('disabled', false)
            updateExportFormSizeSelect(fqExportFileFormats)
            jQuery('#fq-modal-export-size-select').val(1)
          } else if (format === 'png' || format === 'bmp') {
            jQuery('[id^="fq-modal-export-quality"]').prop('disabled', true)
            updateExportFormSizeSelect(fqExportFileFormats)
            jQuery('#fq-modal-export-size-select').val(1)
          } else {
            jQuery('[id^="fq-modal-export-quality"]').prop('disabled', true)
            updateExportFormSizeSelect(fqPdfPageSizes)
            jQuery('#fq-modal-export-size-select').val(fqPdfPageSizes.A4)
          }
        }

        const getAttributes = $node => {
          const attrs = {}
          $.each($node[0].attributes, function (index, attribute) {
            attrs[attribute.name] = attribute.value
          })
          return attrs
        }
        /*
          Find all plots (elements of type image, with class 'fq-iplot')
          in input array of nodes, including plots nested in <g> elements (groups).
          Input: Array of node elements
          Output: Array of plot objects
        */
        const findPlots = (
          elems,
          plotElems,
          descendIntoGroups = true,
          keepOriginalOrder = false
        ) => {
          elems.forEach(item => {
            const isPlot = jQuery(item).hasClass('fq-plot') && jQuery(item).is('image')
            const isGroup = jQuery(item).is('g')
            if (isPlot) {
              const originalWH = jQuery(item)
                .data('original_dimensions')
                .split(',')
              const bBox = item.getBBox()
              const currentElemProps = {
                currentWidth: bBox.width,
                currentHeight: bBox.height,
                x: bBox.x,
                y: bBox.y,
                originalWidth: parseFloat(originalWH[0]),
                originalHeight: parseFloat(originalWH[1]),
                fid: jQuery(item).data('fid')
              }
              currentElemProps.elem = item

              const precisionMultiplier = Math.pow(10, fqFontRoundPrecision)
              currentElemProps.scale =
                  Math.round(
                    (currentElemProps.currentHeight / currentElemProps.originalHeight) *
                      precisionMultiplier
                  ) / precisionMultiplier
              plotElems.push(currentElemProps)
            } else if (isGroup && descendIntoGroups) {
              return findPlots(
                jQuery(item)
                  .children()
                  .toArray(),
                plotElems
              )
            } else if (keepOriginalOrder) {
              plotElems.push({})
            }
          })
          return plotElems
        }

        const adjustPlots = async () => {
          const equalizeProps = jQuery('#fq-modal-adjust-property-equalize').is(':checked')

          const selElems = svgCanvas.getSelectedElements()
          const i = selElems.length

          if (!i) {
            // eslint-disable-next-line no-alert
            alert('Please select at least one object!')
            return
          }

          // Fid all plots in selection, including (nested) groups
          const plotElems = findPlots(selElems, [])
          if (!plotElems.length) {
            // eslint-disable-next-line no-alert
            alert('Please select at least one plot!')
            return
          }
          // Adjust props iteratively
          const plotActions = plotElems.map(function (plotElem) {
            const elem = plotElem.elem
            const csrfToken = fqCsrfToken
            const fid = jQuery(elem).data('fid')
            const href = getElementHref(jQuery(elem))
            const plotUrl = `${baseUrl}v2/plots/${fid}/content`
            fetch(plotUrl, {
              method: 'GET',
              mode: 'cors',
              credentials: 'include',
              headers: {
                'X-CSRFToken': fqCsrfToken
              }
            })
              .then(result => {
                return result.json()
              })
              .then(resultJson => {
                // Update properties
                jQuery('.fq-modal-adjust-checkbox')
                  .filter(':checked')
                  .map(function () {
                    const property = jQuery(this).data('property')
                    const propertyPath = property.split('-')
                    const value = jQuery(`input[data-property='${property}'][type='text']`).val()
                    const valueScaled = equalizeProps ? value / elem.scale : value
                    setDeep(resultJson, propertyPath, valueScaled, true)
                  })
                return resultJson
              })
              .then(resultUpdated => {
                const updatePlotUrl = `${baseUrl}v2/plots/${fid}`
                const data = {
                  figure: resultUpdated
                }
                fetch(updatePlotUrl, {
                  method: 'PUT',
                  mode: 'cors',
                  credentials: 'include',
                  headers: {
                    'X-CSRFToken': csrfToken,
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(data)
                })
              })
              .then(resultUpdated => {
                const updateFileUrl = `${baseUrl}v2/files/${fid}`
                const data = {
                  figure: resultUpdated
                }
                fetch(updateFileUrl, {
                  method: 'PATCH',
                  mode: 'cors',
                  credentials: 'include',
                  headers: {
                    'X-CSRFToken': csrfToken,
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(data)
                }).then(() => {
                  // Update image
                  fetch(href, {
                    cache: 'reload',
                    mode: 'cors',
                    credentials: 'include',
                    headers: {
                      'X-CSRFToken': csrfToken
                    }
                  }).then(() => {
                    jQuery(elem).attr('xlink:href', href + '#' + new Date().getTime())
                  })
                })
              })
          })
          await Promise.all(plotActions)
        }

        const getPlotAxesProps = jsonObj => {
          return {
            marginLeft:
                typeof jsonObj?.layout?.margin?.l !== 'undefined'
                  ? jsonObj?.layout?.margin?.l
                  : jsonObj.layout?.template?.layout?.margin?.l,
            marginBottom:
                typeof jsonObj?.layout?.margin?.b !== 'undefined'
                  ? jsonObj?.layout?.margin?.b
                  : jsonObj.layout?.template?.layout?.margin?.b,
            width:
                typeof jsonObj?.layout?.width !== 'undefined'
                  ? jsonObj?.layout?.width
                  : jsonObj.layout?.template?.layout?.width,
            height:
                typeof jsonObj?.layout?.height !== 'undefined'
                  ? jsonObj?.layout?.height
                  : jsonObj.layout?.template?.layout?.height
          }
        }

        const alignPlots = async axis => {
          const refDim = axis === 'x' ? 'y' : 'x'
          const selElems = svgCanvas.getSelectedElements()

          // Fid all plots in selection, excluding (nested) groups, while maintaining order of elements
          const plotElems = findPlots(selElems, [], false, true)

          // Find reference plot
          let minDim = Infinity
          let plotNumber = 0
          let indexRef
          plotElems.forEach((plot, index) => {
            if (Object.keys(plot).length !== 0 && plot[refDim] < minDim) {
              minDim = plot[refDim]
              indexRef = index
            }
            if (Object.keys(plot).length !== 0) {
              plotNumber++
            }
          })

          if (plotNumber < 2) {
            // eslint-disable-next-line no-alert
            alert('Please select at least two plots!')
            return
          }

          const actions = plotElems.map(function (plot) {
            let r
            if (Object.keys(plot).length === 0) {
              // Not a plot, return empty object to maintain order of elements
              r = new Promise(resolve => {
                resolve({})
              })
            } else {
              r = getPlotDataFromFiglinQ(plot.fid)
            }
            return r
          })

          const results = Promise.all(actions)

          results.then(data => {
            const dx = []
            const dy = []
            const j = plotElems.length
            let k = 0

            // Get ref plot info
            const refPlotAxesProps = getPlotAxesProps(data[indexRef])
            const precisionMultiplier = Math.pow(10, fqAlignRoundPrecision)
            const refScale =
                Math.round(
                  (plotElems[indexRef].currentHeight / refPlotAxesProps.height) *
                    precisionMultiplier
                ) / precisionMultiplier

            const refXAxisPos =
                plotElems[indexRef].y +
                plotElems[indexRef].currentHeight -
                refPlotAxesProps.marginBottom * refScale
            const refYAxisPos = plotElems[indexRef].x + refPlotAxesProps.marginLeft * refScale

            while (k < j) {
              const dataItem = data[k]
              const plotItem = plotElems[k]

              if (Object.keys(plotItem).length === 0) {
                // Not a plot, don't move
                dx.push(0)
                dy.push(0)
              } else {
                const plotAxesProps = getPlotAxesProps(dataItem)
                if (axis === 'x') {
                  const scale =
                      Math.round(
                        (plotElems[k].currentHeight / plotAxesProps.height) * precisionMultiplier
                      ) / precisionMultiplier

                  const xAxisPos =
                      plotElems[k].y +
                      plotElems[k].currentHeight -
                      plotAxesProps.marginBottom * scale
                  const delta = refXAxisPos - xAxisPos
                  dx.push(0)
                  dy.push(delta)
                } else {
                  const scale =
                      Math.round(
                        (plotElems[k].currentWidth / plotAxesProps.width) * precisionMultiplier
                      ) / precisionMultiplier

                  const yAxisPos = plotElems[k].x + plotAxesProps.marginLeft * scale
                  const delta = refYAxisPos - yAxisPos
                  dx.push(delta)
                  dy.push(0)
                }
              }
              k++
            }
            svgCanvas.moveSelectedElements(dx, dy)
          })
        }

        const exportImageFromEditor = async () => {
          const fqElements = jQuery('#svgcontent').find('.fq-image, .fq-plot')

          // Empty temp div
          jQuery('#fq-svg-container').empty()

          // Clone SVG into temp div
          const svgString = svgCanvas.svgCanvasToString()

          // Get SVG document
          const doc = new DOMParser().parseFromString(svgString, 'application/xml')
          jQuery('#fq-svg-container').append(doc.documentElement)

          // Inline raster images and plots
          const itemArray = []
          const attrArray = {}
          let curId
          let newId
          if (fqElements.length) {
            let tempObj = {}
            jQuery(fqElements).each(function () {
              // Replace IDs
              curId = jQuery(this).attr('id')
              newId = '__' + curId
              const type = jQuery(this).hasClass('fq-image') ? 'image' : 'plot'
              jQuery('#fq-svg-container').find(`[id='${curId}']`).attr('id', newId)

              // Get attributes
              attrArray[newId] = getAttributes(jQuery(this))

              tempObj = {
                id: newId,
                type
              }

              if (type === 'image') {
                const fid = parseFid(attrArray[newId]['data-fid'], 0) + ':' + parseFid(attrArray[newId]['data-fid'], 1)
                tempObj.url = baseUrl + 'v2/external-images/' + fid + '/get_thumbnail'
              } else {
                tempObj.url = getElementHref(this)
              }

              itemArray.push(tempObj)
            })

            // Get plot svg string or image blob
            const fetchPromises = itemArray.map(function (item) {
              item.imageData = item.type === 'plot'
                ? fetchSvgString(item.url)
                : fetchImageBase64(item.url)
              return item
            })
            const data = await Promise.all(fetchPromises)

            const newElemPromises = data.map(async function (item) {
              let promise
              if (item.type === 'plot') {
                const svgString = await item.imageData
                promise = new Promise(resolve => {
                  const elem = new DOMParser().parseFromString(
                    svgString,
                    'application/xml'
                  ).documentElement
                  jQuery(elem).attr('id', item.id)
                  jQuery('#fq-svg-container').find('#' + item.id).replaceWith(elem)
                  resolve()
                })
              } else {
                const imageBase64 = await item.imageData
                jQuery('#fq-svg-container').find('#' + item.id).attr('href', imageBase64 + '#' + new Date().getTime())
                promise = new Promise(resolve => { resolve() })
              }
              return promise
            })
            await Promise.all(newElemPromises)
          }

          let source, target

          for (const curId in attrArray) {
            source = jQuery('#svgcontent').find('#' + curId.substring(2))[0]
            target = jQuery('#fq-svg-container').find('#' + curId)[0]
            copyAttributes(source, target)
          }
          // Remove non-whitelisted attributes
          // if( $.inArray(key, svgAttrWhitelist) === -1 ) {
          //   jQuery("#fq-svg-container").find("#" + info.id).removeAttr(key)
          // }
          // Get the svg string
          const el = document.getElementById('fq-svg-container')
          const svgEl = el.firstChild
          const serializer = new XMLSerializer()
          const svgStr = serializer.serializeToString(svgEl)
          // jQuery('#fq-svg-container').empty()

          // Create image
          if (fqExportDocType === 'pdf') {
            svgToPdf(svgStr)
          } else {
            if (fqExportMode === 'download') {
              svgToRaster(svgStr)
            } else if (fqExportMode === 'thumb') {
              const blob = await svgToRaster(svgStr)
              return blob
            }
          }
        }

        const copyAttributes = (source, target) => {
          return Array.from(source.attributes).forEach(attribute => {
            target.setAttribute(
              attribute.nodeName === 'id' ? 'data-id' : attribute.nodeName,
              attribute.nodeValue
            )
          })
        }

        /**
           * Adds resize observer to top toolbar and scroll on resize to maintain canvas position
           * @returns {void}
           */
        const addObservers = () => {
          const resizeObserver = new ResizeObserver(function (entries) {
            // Set initial height
            if (!fqToolsTopHeight) {
              fqToolsTopHeight = jQuery('#tools_top').height()
              return
            }
            // Get new height
            const newHeight = entries[0].contentRect.height
            if (fqToolsTopHeight === newHeight) {
              return
            }

            const { workarea } = svgEditor
            // Set new scroll of canvas
            let diff
            if (newHeight < fqToolsTopHeight) {
              diff = fqToolsTopHeight - newHeight
              workarea.scrollTop = workarea.scrollTop - diff
            } else if (newHeight > fqToolsTopHeight) {
              diff = newHeight - fqToolsTopHeight
              workarea.scrollTop = workarea.scrollTop + diff
            }
            // Update current height
            fqToolsTopHeight = newHeight
          })

          // Start observing for top toolbar resize
          resizeObserver.observe(document.querySelector('#tools_top'))
        }

        const setModalConfirmBtnHandler = (handler, args = null) => {
          jQuery('#fq-modal-confirm-btn-ok').unbind('click', onConfirmClear)
          jQuery('#fq-modal-confirm-btn-ok').unbind('click', openFigure)

          jQuery('#fq-modal-confirm-btn-ok').on('click', args, handler)
        }

        const uploadFileToFiglinQ = (
          formData,
          apiEndpoint,
          worldReadable,
          updateModal,
          parentId,
          mode
        ) => {
          let successMsg, errorMsg
          if (mode === 'upload') {
            // Uploading a new file
            successMsg = ' uploaded'
            errorMsg = ' uploaded'
          } else if (mode === 'replace') {
            // Overwriting an existing file
            // parentId = fqCurrentFigData.fid
            successMsg = ' saved'
            errorMsg = ' saved'
          }

          const headers = {
            'X-File-Name': fqExportDocFname,
            'Plotly-World-Readable': worldReadable,
            'X-CSRFToken': fqCsrfToken
          }

          const parentUsername = parentId
            ? parseFid(parentId, 0)
            : parseFid(fqCurrentFigData.fid, 0)
          const parentIndex = parseFid(parentId, 1)
          const savingIntoSharedFolder = parentUsername !== fqUsername

          if (savingIntoSharedFolder) {
            if (mode === 'upload') {
              // Uploading a new file
              headers['Plotly-Parent'] = -1
              headers['target-fid'] = parentId
            } else if (mode === 'replace') {
              // Overwriting an existing file
              headers['Plotly-Parent'] = -1
              // headers["target-fid"] = `${parseFid(fqCurrentFigData.fid, 0)}:${
              //   fqCurrentFigData.parent
              // }`
            }
          } else if (parentId) {
            headers['Plotly-Parent'] = parentIndex
          }

          $.ajax({
            method: 'POST',
            url: baseUrl + 'v2/external-images/' + apiEndpoint,
            xhrFields: { withCredentials: true },
            headers,
            data: formData,
            processData: false,
            contentType: false
          })
            .done(function (response) {
              if (updateModal) {
                jQuery('#fq-modal-refresh-btn').addClass('is-loading')
                fqItemListFolder = ''
                fqItemListFile = ''
                if (fqExportMode === 'upload') {
                  const userId = parseFid(response.file.fid, 0)
                  const fileNumId = parseFid(response.file.fid, 1)
                  const baseHref = `${baseUrl}~${userId}/${fileNumId}.`

                  const ext = response.file.filetype === 'plot' ? 'svg' : 'src'
                  const elementProps = {
                    width: response.file.metadata.width,
                    height: response.file.metadata.height,
                    widthOriginal: response.file.metadata.width,
                    heightOriginal: response.file.metadata.height,
                    x: 0,
                    y: 0,
                    filetype: getSvgeditFiletype(response.file.filetype),
                    fid: response.file.fid,
                    contentHref: baseHref + 'embed',
                    imgHref: baseHref + ext
                  }

                  placeElement(elementProps)
                } else {
                  jQuery('#fq-modal-file').removeClass('is-active')
                  jQuery(document).unbind('keyup', closeModalOnEscape)

                  createCookie('figlinq-fid', response.file.fid, cookieExpiryDays)
                  refreshModalContents()
                }
              }

              showToast('File ' + response.file.filename + successMsg, 'is-success')
              if (fqExportMode !== 'upload') {
                fqCurrentFigData = response.file
                if (
                  typeof fqCurrentFigData.metadata === 'string' ||
                    fqCurrentFigData.metadata instanceof String
                ) {
                  fqCurrentFigData.metadata = JSON.parse(fqCurrentFigData.metadata)
                }
              }

              jQuery('#fq-save-indicator').hide()
              jQuery('#fq-modal-save-confirm-btn').removeClass('is-loading')
              if (fqExportMode !== 'upload') {
                jQuery('#fq-modal-file').removeClass('is-active')
              }
            })
            .fail(function () {
              jQuery('#fq-save-indicator').hide()
              jQuery('#fq-modal-save-confirm-btn').removeClass('is-loading')
              showToast('Error - file was not' + errorMsg, 'is-danger')
            })
        }

        const showModalSpinner = () => {
          jQuery('#fq-loading-overlay').show()
        }
        const hideModalSpinner = () => {
          jQuery('#fq-loading-overlay').hide()
        }

        const showSaveFigureAsDialog = () => {
          if (fqCurrentFigData) {
            const fName = fqCurrentFigData.filename.replace(/\.[^/.]+$/, '')
            jQuery('#fq-modal-save-name-input').val(fName)
            jQuery('#fq-modal-save-confirm-btn').prop('disabled', false)
          } else {
            jQuery('#fq-modal-save-name-input').val('')
          }
          fqModalFileTabMode = 'my'
          prepareFileModal('saveFigureAs')
          refreshModalContents()
        }

        const createUnitMap = () => {
          // Get correct em/ex values by creating a temporary SVG.
          const svg = document.createElementNS(NSSVG, 'svg')
          document.body.append(svg)
          const rect = document.createElementNS(NSSVG, 'rect')
          rect.setAttribute('width', '1em')
          rect.setAttribute('height', '1ex')
          rect.setAttribute('x', '1in')
          svg.append(rect)
          const bb = rect.getBBox()
          svg.remove()

          const inch = bb.x
          const cm = 2.54
          const mm = 25.4
          const pt = 72
          const pc = 6
          _typeMap = {
            em: bb.width,
            ex: bb.height,
            in: inch,
            cm: inch / cm,
            mm: inch / mm,
            pt: inch / pt,
            pc: inch / pc,
            px: 1,
            '%': 0
          }
        }

        const updateMarginsSpacingInputs = () => {
          // Update margin/spacing unit and values
          const curUnit = svgEditor.configObj.curConfig.baseUnit
          const mlPx = fqDefaultMargins.left * _typeMap.mm
          const mtPx = fqDefaultMargins.top * _typeMap.mm
          const mrPx = fqDefaultMargins.right * _typeMap.mm
          const mbPx = fqDefaultMargins.bottom * _typeMap.mm
          const shPx = fqDefaultSpacing.horizontal * _typeMap.mm
          const svPx = fqDefaultSpacing.vertical * _typeMap.mm

          const mlTarget = Math.round((mlPx / _typeMap[curUnit]) * 100) / 100
          const mtTarget = Math.round((mtPx / _typeMap[curUnit]) * 100) / 100
          const mrTarget = Math.round((mrPx / _typeMap[curUnit]) * 100) / 100
          const mbTarget = Math.round((mbPx / _typeMap[curUnit]) * 100) / 100
          const shTarget = Math.round((shPx / _typeMap[curUnit]) * 100) / 100
          const svTarget = Math.round((svPx / _typeMap[curUnit]) * 100) / 100

          jQuery('.margin-unit').html(curUnit)
          jQuery('#fq-content-add-magin-left').val(mlTarget)
          jQuery('#fq-content-add-magin-top').val(mtTarget)
          jQuery('#fq-content-add-magin-right').val(mrTarget)
          jQuery('#fq-content-add-magin-bottom').val(mbTarget)
          jQuery('#fq-content-add-spacing-horizontal').val(shTarget)
          jQuery('#fq-content-add-spacing-vertical').val(svTarget)
        }

        const prepareFileModal = (mode, launchModal = true) => {
          showModalSpinner()
          const elements = []
          let heading = ''
          jQuery('.fq-modal-file-tab').removeClass('is-active')
          switch (mode) {
            case 'openFigure':
              elements.hide = '.modal-action-panel, .fq-modal-file-tab'
              elements.reveal =
                  '.figure-open-panel, #fq-modal-file-tab-my, #fq-modal-file-tab-shared'
              elements.disable = '#fq-modal-files-open-figure-confirm'
              elements.activate = '#fq-modal-file-tab-my'
              heading = 'Open figure'
              fqModalMode = 'openFigure'
              break

            case 'saveFigure':
              break

            case 'saveFigureAs':
              elements.hide =
                  '.modal-action-panel, .fq-modal-file-tab, #fq-modal-file-search-block, #fq-modal-file-tab-preselected'
              elements.reveal =
                  '.file-save-panel, #fq-modal-file-tab-my, #fq-modal-file-tab-shared'
              elements.disable = ''
              elements.activate = '#fq-modal-file-tab-my'
              heading = 'Save figure as'
              fqModalMode = 'saveFigure'
              break

            case 'importLocalContent':
              elements.hide =
                  '.modal-action-panel, .fq-modal-file-tab, #fq-modal-file-search-block, #fq-modal-file-tab-preselected, #fq-modal-file-tab-shared'
              elements.reveal = '.file-upload-panel, #fq-modal-file-tab-my'
              elements.disable = '#fq-modal-upload-confirm-btn'
              elements.activate = '#fq-modal-file-tab-my'
              heading = 'Select destination folder in FiglinQ'
              fqModalMode = 'upload'
              fqExportMode = 'upload'
              break

            case 'addFiglinqContent':
              elements.hide =
                  '.modal-action-panel, .fq-modal-file-tab, #fq-modal-file-tab-preselected'
              elements.reveal =
                  '.content-add-panel, .content-add-options-panel, #fq-modal-file-search-block, #fq-modal-file-tab-my, #fq-modal-file-tab-shared'
              if (fqItemListPreselected) {
                elements.reveal += ', #fq-modal-file-tab-preselected'
              }

              elements.disable = '#fq-modal-add-confirm-btn'
              elements.activate = '#fq-modal-file-tab-my'
              heading = 'Select content to add to this figure'
              fqModalMode = 'addContent'
              updateMarginsSpacingInputs()
              break

            case 'addFiglinqPreselectedContent':
              elements.hide = '.modal-action-panel, #fq-modal-file-panel-breadcrumb'
              elements.reveal =
                  '.content-add-panel, .content-add-options-panel, #fq-modal-file-tab-my, #fq-modal-file-tab-shared'
              elements.disable = '#fq-modal-add-confirm-btn'
              elements.activate = '#fq-modal-file-tab-preselected'
              heading = 'Select content to add to this figure'
              fqModalMode = 'addContent'
              updateMarginsSpacingInputs()
              break
            default:
              break
          }

          jQuery('#file-panel-heading').html(heading)
          jQuery(elements.hide).addClass('is-hidden')
          jQuery(elements.disable).prop('disabled', true)
          jQuery(elements.reveal).removeClass('is-hidden')
          jQuery(elements.activate).addClass('is-active')
          if (launchModal) {
            jQuery('#fq-modal-file').addClass('is-active')
          }
        }

        const scaleElement = (fixedDim, elemWidth, elemHeight, refWidth, refHeight) => {
          const scaledDims = {}

          if (fixedDim === 'width') {
            scaledDims.width = refWidth
            scaledDims.height = Math.round((elemHeight * refWidth) / elemWidth)
          } else if (fixedDim === 'height') {
            scaledDims.width = Math.round((elemWidth * refHeight) / elemHeight)
            scaledDims.height = refHeight
          }
          return scaledDims
        }

        const getSvgeditFiletype = filetype => {
          switch (filetype) {
            case 'external_image':
              return 'image'
            case 'plot':
              return 'plot'
            default:
              return false
          }
        }

        const adjustStyles = () => {
          let style, ids
          // Top panel input labels
          ids = [
            'selected_x',
            'selected_y',
            'rect_width',
            'rect_height',
            'path_node_x',
            'path_node_y',
            'starNumPoints',
            'RadiusMultiplier',
            'radialShift',
            'ellipse_cx',
            'ellipse_cy',
            'ellipse_rx',
            'ellipse_ry',
            'circle_cx',
            'circle_cy',
            'circle_r',
            'line_x1',
            'line_x2',
            'line_y1',
            'line_y2',
            'polySides',
            'image_width',
            'image_height'
          ]
          ids.forEach(id => {
            style = document.createElement('style')
            style.innerHTML =
                "#label{ top: 4px; margin-right: 2px; margin-left: 2px; font-size: 12px; text-transform: capitalize;} #label:after{ content: ':' }"
            document.getElementById(id).shadowRoot.appendChild(style)
          })

          ids = [
            'tool_length_adjust'
          ]
          ids.forEach(id => {
            style = document.createElement('style')
            style.innerHTML =
                "label{ top: 4px; margin-right: 2px; margin-left: 2px; font-size: 12px; text-transform: capitalize;} label:after{ content: ':' }"
            document.getElementById(id).shadowRoot.appendChild(style)
          })
          document
            .querySelector('#se-cmenu_canvas')
            .shadowRoot.querySelector('.contextMenu')
            .setAttribute('style', 'min-width:250px;')

          document.addEventListener('click', function () {
            jQuery(jQuery('#se-cmenu_canvas')[0].shadowRoot).find('#cmenu_canvas').hide()
          })

          // Top panel position input
          style = document.createElement('style')
          style.innerHTML =
              'elix-dropdown-list{ margin-left: 4px; margin-right: 4px} elix-dropdown-list:hover{ cursor: pointer; }'
          document.getElementById('tool_position').shadowRoot.appendChild(style)

          // Color pickers
          style = document.createElement('style')
          const style2 = document.createElement('style')
          style.innerHTML = '#color_picker{top: 200px !important;} .jGraduate_Form_Section{width:124px !important;margin:0px 2px !important;padding:10px 0 5px 0 !important;}'
          style2.innerHTML = '#color_picker{top: 200px !important;} .jGraduate_Form_Section{width:124px !important;margin:0px 2px !important;padding:10px 0 5px 0 !important;}'
          document.getElementById('fill_color').shadowRoot.appendChild(style)
          document.getElementById('stroke_color').shadowRoot.appendChild(style2)

          // Symbol library menu
          style = document.createElement('style')
          style.innerHTML =
              '.menu-item{background-color: var(--main-bg-color); color: white; text-transform: capitalize;} .menu-item:hover{ cursor: pointer; } .image-lib{background-color: var(--main-bg-color)}'
          document.getElementById('tool_shapelib').shadowRoot.appendChild(style)

          // Dropdowns
          ids = ['seg_type', 'tool_font_family']
          ids.forEach(id => {
            style = document.createElement('style')
            style.innerHTML =
                'select{margin-top: 10px; margin-right: 4px; border: none; border-radius: 3px; cursor: pointer;} .menu-item:hover{ cursor: pointer; }'
            document.getElementById(id).shadowRoot.appendChild(style)
          })
        }

        const getPlotProp = (element, propName, defaultPropValue) => {
          // If property is not defined in figure layout, look in template
          return Object.hasOwnProperty.call(element.figure.layout, propName)
            ? element.figure.layout[propName]
            : Object.hasOwnProperty.call(element.figure.layout.template.layout, propName)
              ? element.figure.layout.template.layout[propName]
              : defaultPropValue
        }

        jQuery(document).on('change', '#fq-file-upload-input', () => {
          const fileName = jQuery('#fq-file-upload-input')[0].files.length
            ? jQuery('#fq-file-upload-input')[0].files[0].name
            : false
          if (fileName) {
            jQuery('#fq-modal-upload-confirm-btn').prop('disabled', false)
            jQuery('#fq-file-upload-input-label').html(fileName)
          } else {
            jQuery('#fq-modal-upload-confirm-btn').prop('disabled', true)
          }
        })

        jQuery(document).on('mouseup', '.draggable-source', () => {
          document.activeElement.blur()
        })
        jQuery(document).on('mouseup', '#workarea', () => {
          document.activeElement.blur()
        })

        jQuery(document).on('mouseup', '.fq-modal-adjust-input', e => {
          e.stopPropagation()
        })

        jQuery(document).on('click', '#fq-modal-upload-confirm-btn', e => {
          e.target.blur()
          if (!jQuery('#fq-file-upload-input')[0].files.length) {
            showToast('Please select the file first!', 'is-warning')
            return
          }
          const apiEndpoint = 'upload'
          const worldReadable = false
          const imageFile = jQuery('#fq-file-upload-input')[0].files[0]
          fqExportDocFname = jQuery('#fq-file-upload-input-label').html()
          fqExportMode = 'upload'

          const formData = new FormData()
          formData.append('files', imageFile)
          jQuery('#fq-modal-file').removeClass('is-active')
          uploadFileToFiglinQ(
            formData,
            apiEndpoint,
            worldReadable,
            true,
            fqSelectedFolderId[fqModalFileTabMode],
            'upload'
          )
        })

        jQuery(document).on('change', '#fq-modal-export-format-select', () => {
          updateExportFormState()
        })

        jQuery(document).on('change', '#fq-doc-baseunit', e => {
          const curUnit = svgEditor.configObj.curConfig.baseUnit
          const targetUnit = jQuery(e.target).val()

          const w = jQuery('#fq-doc-setup-width').val()
          const h = jQuery('#fq-doc-setup-height').val()

          const wNum = w.match(/\d+/)[0]
          const hNum = h.match(/\d+/)[0]

          const wToPx = wNum * _typeMap[curUnit]
          const wToTargetUnit = Math.round((wToPx / _typeMap[targetUnit]) * 100) / 100
          const hToPx = hNum * _typeMap[curUnit]
          const hToTargetUnit = Math.round((hToPx / _typeMap[targetUnit]) * 100) / 100

          svgEditor.configObj.curConfig.baseUnit = targetUnit
          svgCanvas.setConfig(svgEditor.configObj.curConfig)
          svgEditor.updateCanvas()

          // Update inputs
          jQuery('#fq-doc-setup-width').val(String(wToTargetUnit) + targetUnit)
          jQuery('#fq-doc-setup-height').val(String(hToTargetUnit) + targetUnit)
          jQuery('#fq-doc-size').val('')
        })

        jQuery(document).on('change', '#fq-doc-setup-width', e => {
          jQuery('#fq-doc-size').val('')

          const w = jQuery(e.target).val()
          const resolution = svgEditor.svgCanvas.getResolution()
          const x = w
          svgEditor.svgCanvas.setResolution(x, resolution.h)
        })

        jQuery(document).on('change', '#fq-doc-setup-height', e => {
          jQuery('#fq-doc-size').val('')

          const h = jQuery(e.target).val()
          const resolution = svgEditor.svgCanvas.getResolution()
          const y = h
          svgEditor.svgCanvas.setResolution(resolution.w, y)
        })

        jQuery(document).on('change', '#fq-doc-size', e => {
          let w, h
          const val = jQuery(e.target).val()
          if (val) {
            const baseUnit = svgEditor.configObj.curConfig.baseUnit
            const wh = val.split('x')
            w = wh[0]
            h = wh[1]

            w = w / _typeMap[baseUnit] + baseUnit
            h = h / _typeMap[baseUnit] + baseUnit

            svgEditor.svgCanvas.setResolution(w, h)

            jQuery('#fq-doc-setup-width').val(w)
            jQuery('#fq-doc-setup-height').val(h)
          }
        })

        jQuery(document).on('click', '#fq-menu-file-export', () => {
          jQuery('#fq-modal-export').addClass('is-active')
        })

        jQuery(document).on('click', '#fq-menu-object-adjust', () => {
          jQuery('#fq-modal-adjust').addClass('is-active')
        })

        jQuery(document).on('click', '#fq-menu-object-align', () => {
          jQuery('#fq-modal-align').addClass('is-active')
        })

        jQuery(document).on('click', '.fq-modal-export-quality', e => {
          const incr = parseInt(jQuery(e.target).data('increment'), 10)
          const value = parseInt(jQuery('#fq-modal-export-quality-input').val(), 10)
          let newValue = value + incr
          if (newValue > 100) {
            newValue = 100
          }
          if (newValue < 10) {
            newValue = 10
          }
          jQuery('#fq-modal-export-quality-input').val(newValue)
        })

        jQuery(document).on('click', '#fq-modal-btn-confirm-save-figure', () => {
          jQuery('#fq-modal-import-newfig').removeClass('is-active')
          showSaveFigureAsDialog()
        })

        jQuery(document).on('click', '.navbar-dropdown .navbar-item', e => {
          e.target.blur()
          jQuery(e.target)
            .parents('.navbar-item.has-dropdown')
            .removeClass('is-hoverable')
          setTimeout(function () {
            jQuery(e.target)
              .parents('.navbar-item.has-dropdown')
              .addClass('is-hoverable')
          }, 100)
        })

        jQuery(document).on('click', '#fq-menu-file-import-local-content', () => {
          fqModalFileTabMode = 'my'
          prepareFileModal('importLocalContent')
          refreshModalContents()
        })

        jQuery(document).on('click', '#fq-modal-adjust-btn-adjust', async e => {
          jQuery(e.currentTarget).addClass('is-loading')
          await adjustPlots()
          jQuery(e.currentTarget).removeClass('is-loading')
        })

        jQuery(document).on('click', '#fq-modal-align-btn-x', async e => {
          jQuery(e.currentTarget).addClass('is-loading')
          await alignPlots('x')
          jQuery(e.currentTarget).removeClass('is-loading')
        })

        jQuery(document).on('click', '#fq-modal-align-btn-y', async e => {
          jQuery(e.currentTarget).addClass('is-loading')
          await alignPlots('y')
          jQuery(e.currentTarget).removeClass('is-loading')
        })

        jQuery(document).on('click', '#fq-modal-export-btn-export', async e => {
          jQuery(e.currentTarget).addClass('is-loading')
          fqExportMode = 'download'
          fqExportDocType = jQuery('#fq-modal-export-format-select').val()
          fqExportDocQuality = parseFloat(jQuery('#fq-modal-export-quality-input').val()) / 100
          fqExportDocFname = jQuery('#fq-modal-export-fname-input').val()
          if (fqExportDocType === 'pdf') {
            fqExportDocSize = jQuery('#fq-modal-export-size-select option:selected').text()
          } else {
            fqExportDocSize = parseInt(jQuery('#fq-modal-export-size-select').val(), 10)
          }

          await exportImageFromEditor()
          jQuery(e.currentTarget).removeClass('is-loading')
        })

        jQuery(document).on('focusout', '#fq-modal-export-quality-input', e => {
          let newValue = parseInt(jQuery(e.target).val(), 10)
          if (newValue > 100) {
            newValue = 100
          }
          if (newValue < 10) {
            newValue = 10
          }
          if (isNaN(newValue)) {
            // eslint-disable-next-line no-magic-numbers
            newValue = 80
          }
          jQuery(e.target).val(newValue)
        })

        jQuery(document).on('click', '#fq-menu-view-show-grid', () => {
          jQuery('#view_grid').click()
          const showGrid = svgEditor.configObj.curConfig.showGrid
          if (showGrid) {
            jQuery('#fq-menu-view-show-grid')
              .find('.material-icons')
              .text('check_box')
          } else {
            jQuery('#fq-menu-view-show-grid')
              .find('.material-icons')
              .text('check_box_outline_blank')
          }
        })

        jQuery(document).on('click', '#fq-menu-view-show-rulers', () => {
          const showRulers = svgEditor.configObj.curConfig.showRulers
          if (!showRulers) {
            jQuery('#fq-menu-view-show-rulers')
              .find('.material-icons')
              .text('check_box')
          } else {
            jQuery('#fq-menu-view-show-rulers')
              .find('.material-icons')
              .text('check_box_outline_blank')
          }
          svgEditor.configObj.curConfig.showRulers = !showRulers
          svgEditor.rulers.display(!showRulers)
        })

        jQuery(document).on('click', '#fq-menu-file-document-properties', () => {
          jQuery('#fq-doc-size').val('')
          const baseUnit = svgEditor.configObj.curConfig.baseUnit
          const resolution = svgEditor.svgCanvas.getResolution()

          jQuery('#fq-doc-baseunit').val(baseUnit)

          const gridSnappingOn = svgEditor.configObj.curConfig.gridSnapping
          const gridSnappingStep = svgEditor.configObj.curConfig.snappingStep

          jQuery('#fq-doc-setup-snapping-enabled').prop('checked', gridSnappingOn)
          jQuery('#fq-doc-setup-snapping-step').val(gridSnappingStep)

          jQuery('#fq-doc-setup-width').val(resolution.w / _typeMap[baseUnit] + baseUnit)
          jQuery('#fq-doc-setup-height').val(resolution.h / _typeMap[baseUnit] + baseUnit)
          jQuery('#fq-modal-doc-setup').addClass('is-active')
        })

        jQuery(document).on('change', '#fq-doc-setup-snapping-enabled', e => {
          const gridSnappingOn = jQuery(e.target).prop('checked')
          svgEditor.configObj.curConfig.gridSnapping = gridSnappingOn
          svgCanvas.setConfig(svgEditor.configObj.curConfig)
          svgEditor.updateCanvas()
        })

        jQuery(document).on('keyup', '#fq-doc-setup-snapping-step', e => {
          const snappingStep = parseInt(jQuery(e.target).val(), 10)
          svgEditor.configObj.curConfig.snappingStep = snappingStep
          svgCanvas.setConfig(svgEditor.configObj.curConfig)
          svgEditor.updateCanvas()
        })

        jQuery(document).on('click', '.fq-modal-adjust-copy', e => {
          const property = jQuery(e.target).data('property')
          const refValue = jQuery(`input[data-property='${property}'][type='text']`).val()
          const inputs = jQuery('.fq-modal-adjust-input')
          let visited = false
          inputs.each(function () {
            if (visited) {
              jQuery(this).val(refValue)
            }
            if (jQuery(this).data('property') === property) {
              visited = true
            }
          })
        })

        jQuery(document).on('click', '#fq-doc-setup-save-btn', () => {
          const predefined = jQuery('#fq-doc-size').val()
          const gridSnappingStep = parseInt(jQuery('#fq-doc-setup-snapping-step').val(), 10)
          const gridSnappingOn = jQuery('#fq-doc-setup-snapping-enabled').prop('checked')

          const w = predefined === 'fit' ? 'fit' : jQuery('#fq-doc-setup-width').val()
          const h = predefined === 'fit' ? 'fit' : jQuery('#fq-doc-setup-height').val()
          const baseunit = jQuery('#fq-doc-baseunit').val()
          jQuery('#fq-modal-doc-setup').removeClass('is-active')

          if (w !== 'fit' && !isValidUnit('width', w)) {
            showToast('Invalid width unit!', 'is-danger')
            return
          }
          if (h !== 'fit' && !isValidUnit('height', h)) {
            showToast('Invalid height unit!', 'is-danger')
            return
          }

          if (!svgCanvas.setResolution(w, h)) {
            showToast('No content to fit!', 'is-danger')
          }

          svgEditor.configObj.curConfig.baseUnit = baseunit
          svgEditor.configObj.curConfig.gridSnapping = gridSnappingOn
          svgEditor.configObj.curConfig.snappingStep = gridSnappingStep

          svgCanvas.setConfig(svgEditor.configObj.curConfig)
          svgEditor.updateCanvas()
        })

        jQuery(document).on('click', '.fq-modal-cancel-btn', (e) => {
          jQuery(e.target).parent().closest('.modal').removeClass('is-active')
          // jQuery('.modal').removeClass('is-active')
        })

        jQuery(document).on('click', '.fq-modal-file-tab', e => {
          e.preventDefault()
          showModalSpinner()
          jQuery('.fq-modal-file-tab').removeClass('is-active')
          jQuery('#fq-modal-add-confirm-btn, #col_select').prop('disabled', true)
          jQuery(e.currentTarget).addClass('is-active')

          fqModalFileTabMode = jQuery(e.currentTarget).data('mode')
          if (fqModalFileTabMode === 'shared') {
            jQuery('#fq-modal-file-search-wrapper').prop('disabled', true)
          } else if (fqModalFileTabMode === 'my') {
            jQuery('#fq-modal-file-search-wrapper').prop('disabled', false)
          } else if (fqModalFileTabMode === 'preselected') {
            jQuery('#fq-modal-file-search-wrapper').prop('disabled', true)
            jQuery('#fq-modal-file-panel-breadcrumb').addClass('is-hidden')
            refreshModalContents(fqItemListPreselected.fids)
            return
          }

          fqSelectedFolderId = {
            my: false,
            shared: false,
            preselected: false
          }
          refreshModalContents()
        })

        jQuery(document).on('click', '#fq-modal-refresh-btn', () => {
          showModalSpinner()
          refreshModalContents()
        })

        jQuery(document).on(
          'click',
          '.fq-modal-plot-item, .fq-modal-image-item, .fq-modal-figure-item',
          e => {
            if (fqModalMode === 'saveFigure') {
              if (jQuery(e.target).hasClass('fq-modal-figure-item')) {
                jQuery('.fq-modal-plot-item, .fq-modal-image-item, .fq-modal-figure-item').removeClass(
                  'is-active'
                )
                jQuery(e.target).addClass('is-active')
                const text = jQuery(e.target)
                  .find('.fq-list-item-text')
                  .text()
                jQuery('#fq-modal-save-name-input').val(text)
                jQuery('#fq-modal-save-confirm-btn').prop('disabled', false)
              }
              return
            }

            if (fqModalMode === 'openFigure') {
              jQuery('.fq-modal-plot-item, .fq-modal-image-item, .fq-modal-figure-item').removeClass(
                'is-active'
              )
              jQuery(e.target).addClass('is-active')
              jQuery('#fq-modal-files-open-figure-confirm').prop('disabled', false)
              return
            }

            if (jQuery(e.target).hasClass('is-active')) {
              jQuery(e.target).removeClass('is-active')
            } else {
              jQuery(e.target).addClass('is-active')
            }

            let activePresent = false
            const activeList = []
            jQuery('.fq-modal-plot-item, .fq-modal-image-item, .fq-modal-figure-item').each(
              function () {
                if (jQuery(this).hasClass('is-active')) {
                  activePresent = true
                  activeList.push(jQuery(this).data('fid'))
                }
              }
            )

            if (activePresent) {
              jQuery('#fq-modal-add-confirm-btn').prop('disabled', false)
              jQuery('#fq-modal-add-confirm-btn').data('selectedFid', activeList)
              if (activeList.length > 1) {
                jQuery('#col_select').prop('disabled', false)
              } else {
                jQuery('#col_select').prop('disabled', true)
              }
            } else {
              jQuery('#fq-modal-add-confirm-btn').prop('disabled', true)
            }
          }
        )

        jQuery(document).on('click', '.fq-modal-folder-item', e => {
          e.preventDefault()
          const dataFid = jQuery(e.currentTarget)
            .data('fid')
            .toString()
          const fname = jQuery(e.target)
            .text()
            .trim()

          fqSelectedFolderId[fqModalFileTabMode] = dataFid

          updateBreadcrumb(dataFid, fname)

          fqItemListFolder = ''
          fqItemListFile = ''
          updateItemList(dataFid, 1)
          jQuery('#fq-modal-add-confirm-btn').prop('disabled', true)
          jQuery('#fq-modal-refresh-btn').addClass('is-loading')
        })

        jQuery(document).on('click', '#fq-menu-interact-switch', e => {
          e.target.blur()
          const checked = jQuery('#fq-menu-interact-switch').is(':checked')
          if (checked) {
            setInteractiveOn()
          } else {
            setInteractiveOff()
          }
        })

        jQuery(document).on('click', '#fq-modal-add-confirm-btn', e => {
          e.target.blur()
          svgCanvas.clearSelection()
          jQuery(e.target).addClass('is-loading')

          const selector =
              '.fq-modal-plot-item.is-active, .fq-modal-image-item.is-active, .fq-modal-figure-item.is-active'
          const selectedItems = getSortedElems(selector, 'data-index')
          const columnNumber = parseInt(jQuery('#col_select').val(), 10)
          const margins = {
            left: parseFloat(jQuery('#fq-content-add-magin-left').val()),
            top: parseFloat(jQuery('#fq-content-add-magin-top').val()),
            right: parseFloat(jQuery('#fq-content-add-magin-right').val()),
            bottom: parseFloat(jQuery('#fq-content-add-magin-bottom').val())
          }
          const spacing = {
            horizontal: parseFloat(jQuery('#fq-content-add-spacing-horizontal').val()),
            vertical: parseFloat(jQuery('#fq-content-add-spacing-vertical').val())
          }

          // Calculate margins/spacing in pixels
          const curUnit = svgEditor.configObj.curConfig.baseUnit
          if (curUnit !== 'px') {
            margins.left = margins.left * _typeMap[curUnit]
            margins.top = margins.top * _typeMap[curUnit]
            margins.right = margins.right * _typeMap[curUnit]
            margins.bottom = margins.bottom * _typeMap[curUnit]

            spacing.horizontal = spacing.horizontal * _typeMap[curUnit]
            spacing.vertical = spacing.vertical * _typeMap[curUnit]
          }

          const elementProps = []
          $.each(selectedItems, function (index) {
            elementProps[index] = {
              fid: jQuery(selectedItems[index]).data('fid'),
              endpoint: jQuery(selectedItems[index]).data('ftype') === 'plot' ? 'plots' : 'files'
            }
          })

          const fixedDim = 'height'
          const pageDims = svgEditor.svgCanvas.getResolution()
          // Get information about all elements
          const actions = elementProps.map(function (prop) {
            return getFileDataFromFiglinQ(prop.fid, prop.endpoint)
          })
          const results = Promise.all(actions) // pass array of promises
          results.then(data => {
            // Default plot width / height
            const wDefault = 400
            const hDefault = 360

            // Reference plot width / height
            let wRef = wDefault
            let hRef = hDefault

            // If there is at least 1 plot, use it as size reference
            let refPlotIndex = false
            data.some((element, index) => {
              // Get dimensions of the first selected plot, either from layout or from template (if not defined in layout)
              const userId = parseFid(element.fid, 0)
              const fileNumId = parseFid(element.fid, 1)
              const baseHref = `${baseUrl}~${userId}/${fileNumId}.`
              let w, h

              if (element.filetype === 'plot') {
                w = getPlotProp(element, 'width', wRef)
                h = getPlotProp(element, 'height', hRef)

                // Set dimensions of the first plot as reference
                if (refPlotIndex === false) {
                  refPlotIndex = index
                  wRef = w
                  hRef = h
                }

                data[index].imgHref = baseHref + 'svg'
                data[index].svgeditFiletype = 'plot'
              } else if (element.filetype === 'external_image') {
                w = element.metadata.width
                h = element.metadata.height
                data[index].imgHref = baseHref + 'src'
                data[index].svgeditFiletype = 'image'
              }
              data[index].width = w || wDefault
              data[index].height = h || hDefault
              data[index].contentHref = baseHref + 'embed'
            })

            // Find the maximum width of all elements after applying the multi-column layout
            let x = 0
            let y = 0
            let curColumn = 1
            const pageWidthUsable =
                pageDims.w - margins.right - margins.left - spacing.horizontal * (columnNumber - 1)
            let maxX = pageWidthUsable // Only scale if layout is wider than the page minus margins, otherwise keep original dimensions
            data.some(element => {
              // Scale all elements to appropriate height
              const scaledDims = scaleElement(
                fixedDim,
                element.width,
                element.height,
                wRef,
                hRef
              )
              element.widthScaled = scaledDims.width
              element.heightScaled = scaledDims.height

              x += scaledDims.width
              maxX = Math.max(maxX, x)

              curColumn += 1
              if (curColumn > columnNumber) {
                curColumn = 1
                x = 0
                y += hRef + spacing.vertical
              }
            })

            // Calculate scaling page factor
            const pageScaleFactor = pageWidthUsable / maxX
            const hRefScaled = hRef * pageScaleFactor

            // Set initial positioning, including margins
            curColumn = 1
            x = margins.left
            y = margins.top

            // Finally, place new elements and add letters

            const addLetters = jQuery('#fq-add-panel-letters').val()

            data.some((element, index) => {
              element.widthScaled = element.widthScaled * pageScaleFactor
              element.heightScaled = element.heightScaled * pageScaleFactor

              const elementProps = {
                width: element.widthScaled,
                height: element.heightScaled,
                widthOriginal: element.width,
                heightOriginal: element.height,
                x,
                y,
                filetype: element.svgeditFiletype,
                fid: element.fid,
                contentHref: element.contentHref,
                imgHref: element.imgHref
              }

              placeElement(elementProps)

              if (addLetters) {
                let letter = alphabet[index]
                if (addLetters === 'lower') {
                  letter = letter.toLowerCase()
                }
                const offset = 6
                const attr = {
                  x: x - offset,
                  y: y - offset,
                  id: svgCanvas.getNextId(),
                  fill: '#000000',
                  'stroke-width': '0',
                  'font-size': '14',
                  'font-family': 'Sans-serif',
                  'text-anchor': 'middle',
                  'xml:space': 'preserve',
                  opacity: 1
                }

                placeTextElement(attr, letter)
              }

              x += element.widthScaled + spacing.horizontal
              curColumn += 1
              if (curColumn > columnNumber) {
                curColumn = 1
                x = margins.left
                y += hRefScaled + spacing.vertical
              }
            })

            jQuery(e.target).removeClass('is-loading')
            jQuery('#fq-modal-file').removeClass('is-active')
            jQuery(document).unbind('keyup', closeModalOnEscape)
            const delay = 500
            setTimeout(function () {
              svgEditor.zoomChanged(window, 'layer')
            }, delay)
          })
        })

        jQuery(document).on('click', '#fq-modal-file-search-icon.fa-times-circle', () => {
          jQuery('#fq-modal-file-search-input')
            .val('')
            .keyup()
        })

        jQuery(document).on('keyup', '#fq-modal-file-search-input', () => {
          refreshModalContents()
        })

        jQuery(document).on('keyup', '#fq-modal-save-name-input', e => {
          const val = jQuery(e.target).val()

          if (val.length) {
            jQuery('#fq-modal-save-confirm-btn').prop('disabled', false)
          } else {
            jQuery('#fq-modal-save-confirm-btn').prop('disabled', true)
          }
        })

        jQuery(document).on('click', '#fq-modal-files-open-figure-confirm', () => {
          jQuery('#fq-modal-file').removeClass('is-active')
          jQuery(document).unbind('keyup', closeModalOnEscape)
          jQuery('#fq-modal-confirm-btn-ok').html('Open figure')
          jQuery('#fq-modal-confirm').addClass('is-active')
          const fid = jQuery('.fq-modal-figure-item.is-active').data('fid')
          setModalConfirmBtnHandler(openFigure, { fid })
        })

        jQuery(document).on('click', '#fq-menu-file-new-figure', () => {
          jQuery('#fq-modal-confirm-btn-ok').html('New figure')
          setModalConfirmBtnHandler(onConfirmClear)
          jQuery('#fq-modal-confirm').addClass('is-active')
        })

        jQuery(document).on('click', '#fq-modal-save-confirm-btn', async event => {
          jQuery('#fq-modal-save-confirm-btn').addClass('is-loading')
          event.target.blur()
          fqExportMode = 'thumb'
          fqExportDocType = 'png'
          fqExportDocFname = jQuery('#fq-modal-save-name-input').val()
          fqExportDocSize = parseInt(jQuery('#fq-modal-export-size-select').val(), 10)

          const worldReadable = false

          // TODO *properly* check if file name exists via API
          let replacedFid
          let nameExists = false
          jQuery('.fq-modal-image-item, .fq-modal-figure-item').each(function () {
            if (
              jQuery(this)
                .find('.fq-list-item-text')
                .text() ===
                fqExportDocFname
            ) {
              nameExists = true
              replacedFid = jQuery(this).data('fid')
            }
          })

          if (nameExists) {
            // eslint-disable-next-line no-alert
            if (!confirm('File already exists. Overwrite?')) {
              jQuery('#fq-modal-save-confirm-btn').removeClass('is-loading')
              return
            }
          }

          if (fqSelectedFolderId[fqModalFileTabMode] === 'shared:-1') {
            showToast('Please select one of the shared folders!', 'is-danger')
            return
          }

          // Clean up image URLs to remove cachebusting hashes (see adjustPlots())
          // resetPlotImageUrls()

          const svg = getSvgFromEditor()

          const apiEndpoint = 'upload'

          const imageBlob = new Blob([svg], { type: 'image/svg+xml' })
          const imageFile = new File([imageBlob], fqExportDocFname + '.svg')

          const thumbBlob = await exportImageFromEditor()

          const thumbFile = new File([thumbBlob], fqExportDocFname + '_thumb.png')

          const formData = new FormData()

          formData.append('files', imageFile)
          formData.append('thumb', thumbFile)

          // Check if figure contains any linked content
          const fqElements = jQuery('.fq-image, .fq-plot, .fq-figure')
          const hasLinkedContent = fqElements.length > 0

          // Add metadata
          const metadata = fqCurrentFigData ? fqCurrentFigData.metadata : {}
          metadata.svgedit = metadata.svgedit || {}
          if (hasLinkedContent) {
            metadata.svgedit.haslinkedcontent = true
          } else {
            metadata.svgedit.haslinkedcontent = false
          }
          formData.append('metadata', JSON.stringify(metadata))

          if (nameExists) {
            formData.append('replaced_fid', replacedFid)
          }

          uploadFileToFiglinQ(
            formData,
            apiEndpoint,
            worldReadable,
            true,
            fqSelectedFolderId[fqModalFileTabMode],
            'upload'
          )
        })

        jQuery(document).on('change', '#zoom', e => {
          let value = jQuery(e.target).val()
          switch (value) {
            case 'default':
              return
            case 'canvas':
            case 'selection':
            case 'layer':
            case 'content':
              svgEditor.zoomChanged(window, value)
              break
            default: {
              const zoomlevel = Number(value) / 100
              const minZoom = 0.1
              const edgeZoom = 0.001
              if (zoomlevel < edgeZoom) {
                value = minZoom
                return
              }
              const zoom = svgCanvas.getZoom()
              const { workarea } = svgEditor
              svgEditor.zoomChanged(
                window,
                {
                  width: 0,
                  height: 0,
                  // center pt of scroll position
                  x:
                      (workarea.scrollLeft +
                        parseFloat(getComputedStyle(workarea, null).width.replace('px', '')) / 2) /
                      zoom,
                  y:
                      (workarea.scrollTop +
                        parseFloat(getComputedStyle(workarea, null).height.replace('px', '')) / 2) /
                      zoom,
                  zoom: zoomlevel
                },
                true
              )
            }
          }
          jQuery(e.target).val('default')
        })

        jQuery(document).on('click', '.fq-menu-add-content-btn', () => {
          setInteractiveOff()
          prepareFileModal('addFiglinqContent')
          fqModalFileTabMode = 'my'
          refreshModalContents()
        })

        jQuery(document).on('click', '#fq-menu-file-save-figure', async event => {
          setInteractiveOff()

          if (!fqCurrentFigData) {
            // New figure >> show save as dialog
            showSaveFigureAsDialog()
            return
          }

          jQuery('#fq-save-indicator').show()
          event.target.blur()

          fqExportMode = 'thumb'
          fqExportDocType = 'png'
          fqExportDocFname = fqCurrentFigData.filename

          fqSelectedFolderId[fqModalFileTabMode] =
              parseFid(fqCurrentFigData.fid, 0) + ':' + fqCurrentFigData.parent
          const worldReadable = fqCurrentFigData.world_readable
          const replacedFid = fqCurrentFigData.fid

          // Clean up image URLs to remove cachebusting hashes (see adjustPlots())
          // resetPlotImageUrls()

          const svg = getSvgFromEditor()
          // IMPORTANT set to 'replace' if updating prod until new backend is live
          // const apiEndpoint = 'replace'

          // TODO set to 'upload' once new backend is live
          const apiEndpoint = 'upload'

          const imageBlob = new Blob([svg], {
            type: 'image/svg+xml'
          })
          const imageFile = new File([imageBlob], fqExportDocFname + '.svg')

          const thumbBlob = await exportImageFromEditor()
          const thumbFile = new File([thumbBlob], fqExportDocFname + '_thumb.svg')

          const formData = new FormData()

          formData.append('files', imageFile)
          formData.append('thumb', thumbFile)
          formData.append('replaced_fid', replacedFid)

          // Check if figure contains any linked content
          const fqElements = jQuery('.fq-image, .fq-plot, .fq-figure')
          const hasLinkedContent = fqElements.length > 0

          const metadata = fqCurrentFigData.metadata || {}
          metadata.svgedit = metadata.svgedit || {}
          if (hasLinkedContent) {
            metadata.svgedit.haslinkedcontent = true
          } else {
            metadata.svgedit.haslinkedcontent = false
          }
          formData.append('metadata', JSON.stringify(metadata))

          // const fid = fqCurrentFigData.fid
          // const username = parseFid(replacedFid, 0)
          // const id = parseFid(replacedFid, 1)

          // const parentId =
          //   username === fqUsername ? fqCurrentFigData.parent : -1
          // console.log(fqCurrentFigData)

          uploadFileToFiglinQ(formData, apiEndpoint, worldReadable, false, false, 'replace')
        })

        jQuery(document).on('click', '#fq-menu-file-save-figure-as', () => {
          setInteractiveOff()
          showSaveFigureAsDialog()
        })

        jQuery(document).on('click', '.navbar-burger', () => {
          jQuery('.navbar-burger').toggleClass('is-active')
          jQuery('.navbar-menu').toggleClass('is-active')
        })

        jQuery(document).on('keyup', '.fq-margin-input', e => {
          if (jQuery('#fq-content-add-link-margins').prop('checked') === true) {
            jQuery('.fq-margin-input').val(jQuery(e.target).val())
          }
        })

        jQuery(document).on('click', '#fq-menu-file-open-figure', () => {
          prepareFileModal('openFigure')
          refreshModalContents()
        })

        // Init
        createUnitMap()
        ensureRulesGrids()
        getFqUsername()
        setInteractiveOff()
        addObservers()
        upgradeUi()
        adjustStyles()
        loadFqFigure()
        updateExportFormState()
        activateDraggableModals()
        // eslint-disable-next-line no-undef
      }
    }
  }
}
