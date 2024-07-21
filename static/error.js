const src = "/static/goofy/";
const flaskSrc = (file) => {
  // return `{{ url_for('static', filename='/goofy/${file}') }}`;
  return src + file;
};

const goofy = [];

for (let i = 1; i <= 11; i++) {
  goofy.push(`s${i}`);
}

for (let i = 1; i <= 13; i++) {
  goofy.push(`v${i}`);
}

window.onload = () => {
  setTimeout(() => {
    let rng = Math.floor(Math.random() * goofy.length);

    if (rng <= 0) {
      rng = 1;
    }

    const sillything = goofy[rng];

    let node = undefined;

    if (sillything.includes("v")) {
      let sourceElement = document.createElement("source");
      // sourceElement.src = src + sillything + ".mp4";
      sourceElement.src = flaskSrc(sillything + ".mp4");
      sourceElement.append(node);

      node = document.createElement("video");
      node.append(sourceElement);
      node.controls = true;
      node.autoplay = true;
    } else {
      node = document.createElement("img");
      // node.src = src + sillything + ".png";
      node.src = flaskSrc(sillything + ".png");
    }

    // document.body.append(node);
    document.getElementById("detailsContainer").append(node);
    node.style.display = "block";
    node.style.margin = "0 auto";
    node.className = "goofy";
  }, 100);
};
