async function delay(sec){
    return new Promise(resolve => setTimeout(resolve, sec * 1000));
}

function init() {
    document.querySelectorAll("div.randombg").forEach(div => {
        let r = Math.round(Math.random() * 20);
        let bg_string = `url(static/img/bgs/${r}.jpg)`;
        div.style.backgroundImage = bg_string;
    });
}

function switch_to_parsing() {
    let parent = document.getElementById("input_container");
    parent.innerHTML = "<h1>Datei wird verarbeitet...</h1>";
}

function add_info(text) {
    let parent = document.getElementById("input_container");
    let info = document.createElement("span");
    info.textContent = text;
    info.innerHTML += "<br>";
    parent.appendChild(info);
}
function edit_info(text) {
    let parent = document.getElementById("input_container");
    parent.lastChild.textContent = text;
    parent.lastChild.innerHTML += "<br>";
}

function download_result(content) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', 'ms_money_export.qif');

    element.textContent = "Download starten";
    document.getElementById("input_container").appendChild(element);
}


const inputContainer = document.querySelector("#input_container");
inputContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = (event) => convert(event.target.result);
    reader.readAsText(file);
});
inputContainer.addEventListener("dragover", (e) => e.preventDefault());

window.onload = init;