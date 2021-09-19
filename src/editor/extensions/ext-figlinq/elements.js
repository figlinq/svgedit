export function folderItem(name, id){
    return `
    <a class="panel-block panel-list-item folder-item" data-fid="` + id + `">
        <span class="panel-icon">
            <i class="fas fa-folder-open" aria-hidden="true"></i>
        </span>` 
        + name +
    `</a>`;
}
export function plotItem(name, id){
    return `
    <a class="panel-block panel-list-item plot-item" data-fid="` + id + `">
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