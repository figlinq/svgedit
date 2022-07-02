export function folderItem(name, fid) {
  return `
    <a class="is-relative panel-block panel-list-item fq-modal-folder-item noselect is-size-7" data-fid="${fid}">
        <span class="panel-icon has-text-black">
            <i class="fas fa-folder-open" aria-hidden="true"></i>
        </span>${name}</a>`
}
export function plotItem(name, fid, index) {
  return `
    <a class="is-relative panel-block panel-list-item fq-modal-image-item noselect is-size-7" data-ftype="plot" data-fid="${fid}" data-index="${index}">
        <span class="panel-icon">
            <i class="fas fa-chart-bar" aria-hidden="true"></i>
        </span>
        <span class="fq-list-item-text">${name}</span>
    </a>`
}

export function imageItem(name, fid, index) {
  return `
    <a class="is-relative panel-block panel-list-item fq-modal-image-item noselect is-size-7" data-ftype="image" data-fid="${fid}" data-index="${index}">
        <span class="panel-icon">
            <i class="fas fa-image" aria-hidden="true"></i>
        </span>
        <span class="fq-list-item-text">${name}</span>
    </a>`
}

export function figureItem(name, fid, index, haslinkedcontent = false) {
  const disabledStr = haslinkedcontent ? 'is-disabled' : ''
  const explanation = haslinkedcontent
    ? `<span class="fq-list-item-text panel-list-explanation"><i class="fas fa-exclamation-triangle mr-2"></i>Figure with linked content cannot be added to another figure.</span>`
    : ''
  return `
    <a class="is-relative panel-block panel-list-item fq-modal-figure-item noselect is-size-7 ${disabledStr}" data-ftype="figure" data-fid="${fid}" data-index="${index}">
        <span class="panel-icon fa-stack">
            <i class="fas fa-shapes fa-stack-1x"></i>
            <i class="far fa-square fa-stack-2x"></i>
        </span>
        <span class="fq-list-item-text">${name}</span>
        ${explanation}
    </a>`
}

export function breadcrumb(dataFid, fname) {
  const fid = dataFid.includes(':') ? dataFid.substring(dataFid.indexOf(':') + 1) : dataFid
  let element
  if (fid === -1) {
    element = `<li>
                <div class="fq-modal-folder-item" data-fid="${dataFid}">
                    <span class="icon">
                        <i class="fas fa-home"></i>
                    </span>&nbsp
                </div>
            </li>`
  } else {
    element = `<li class="breadcrumb-item" data-fid="${dataFid}">
                <a href="#" class="fq-modal-folder-item" data-fid="${dataFid}">${fname}</a>
            </li>`
  }
  return element
}
