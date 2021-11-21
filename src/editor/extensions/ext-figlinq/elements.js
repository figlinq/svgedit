export function folderItem(name, fid){
    return `
    <a class="panel-block panel-list-item fq-modal-folder-item noselect is-size-7" data-fid="${fid}">
        <span class="panel-icon has-text-black">
            <i class="fas fa-folder-open" aria-hidden="true"></i>
        </span>${name}</a>`;
}
export function plotItem(name, fid, index){
    return `
    <a class="panel-block panel-list-item fq-modal-image-item noselect is-size-7" data-ftype="plot" data-fid="${fid}" data-index="${index}">
        <span class="panel-icon">
            <i class="fas fa-chart-bar" aria-hidden="true"></i>
        </span>
        <span class="fq-list-item-text">${name}</span>
    </a>`;
}

export function imageItem(name, fid, index){
    return `
    <a class="panel-block panel-list-item fq-modal-image-item noselect is-size-7" data-ftype="image" data-fid="${fid}" data-index="${index}">
        <span class="panel-icon">
            <i class="fas fa-image" aria-hidden="true"></i>
        </span>
        <span class="fq-list-item-text">${name}</span>
    </a>`;
}

export function breadcrumb(dataFid, fname){
    const fid = dataFid.includes(":")
        ? dataFid.substring(dataFid.indexOf(":") + 1)
        : dataFid;

    if (fid == -1) {
        return (
            `<li>
                <div class="fq-modal-folder-item" data-fid="${dataFid}">
                    <span class="icon">
                        <i class="fas fa-home"></i>
                    </span>&nbsp;
                </div>
            </li>`
        );
    } else {
        return (
            `<li class="breadcrumb-item" data-fid="${dataFid}">
                <a href="#" class="fq-modal-folder-item" data-fid="${dataFid}">${fname}</a>
            </li>`
        );
    }
}