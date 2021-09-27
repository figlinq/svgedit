export function folderItem(name, id){
    return `
    <a class="panel-block panel-list-item folder-item" data-fid="` + id + `">
        <span class="panel-icon">
            <i class="fas fa-folder-open" aria-hidden="true"></i>
        </span>` 
        + name +
    `</a>`;
}
export function plotItem(name, id, index){
    return `
    <a class="panel-block panel-list-item plot-item" data-fid="` + id + `" data-index="` + index + `">
        <span class="panel-icon">
            <i class="fas fa-chart-bar" aria-hidden="true"></i>
        </span>` 
        + name +
    `</a>`;
}

export function parentItem(fid){
    return `
    <a class="panel-block panel-list-item folder-item" data-fid="` + fid + `">
        <span class="panel-icon">
            <i class="fas fa-level-up-alt" aria-hidden="true"></i>
        </span>..</a>`;
}

export function breadcrumb(fid, fname){
    if (fid == -1) {
        return `<li>
                <div class="folder-item" data-fid="-1">
                    <span class="icon is-small">
                        <i class="fas fa-home"></i>
                    </span>&nbsp;
                </div>
            </li>`;
    } else {
        return `<li class="breadcrumb-item" data-fid="` + fid + `"><a href="#" class="folder-item" data-fid="` + fid + `">
        ` + fname + `</a></li>`;
    }
}