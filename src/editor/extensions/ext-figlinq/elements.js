export function folderItem(name, id){
    return `
    <a class="panel-block panel-list-item fq-modal-folder-item noselect" data-fid="` + id + `">
        <span class="panel-icon">
            <i class="fas fa-folder-open" aria-hidden="true"></i>
        </span>` 
        + name +
    `</a>`;
}
export function plotItem(name, id, index){
    return `
    <a class="panel-block panel-list-item fq-modal-plot-item noselect" data-ftype="plot" data-fid="` + id + `" data-index="` + index + `">
        <span class="panel-icon">
            <i class="fas fa-chart-bar" aria-hidden="true"></i>
        </span><span class="fq-list-item-text">` 
        + name +
    `</span></a>`;
}

export function imageItem(name, id, index){
    return `
    <a class="panel-block panel-list-item fq-modal-image-item noselect" data-ftype="image" data-fid="` + id + `" data-index="` + index + `">
        <span class="panel-icon">
            <i class="fas fa-image" aria-hidden="true"></i>
        </span><span class="fq-list-item-text">` 
        + name +
    `</span></a>`;
}

export function breadcrumb(fid, fname){
    if (fid == -1) {
        return `<li>
                <div class="fq-modal-folder-item" data-fid="-1">
                    <span class="icon is-small">
                        <i class="fas fa-home"></i>
                    </span>&nbsp;
                </div>
            </li>`;
    } else {
        return `<li class="breadcrumb-item" data-fid="` + fid + `"><a href="#" class="fq-modal-folder-item" data-fid="` + fid + `">
        ` + fname + `</a></li>`;
    }
}