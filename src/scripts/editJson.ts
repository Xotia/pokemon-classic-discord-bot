const fs = require("fs");

const file1Path = "E:\\source\\pokemon-classic\\data\\pokemon-gen1.json";
const file2Path = "E:\\source\\pokemon-classic\\src\\utils\\data\\pokemon-gen1.json";
const outputPath = "E:\\source\\pokemon-classic\\src\\utils\\data\\output.json";

const file1 = JSON.parse(fs.readFileSync(file1Path, "utf8"));
const file2 = JSON.parse(fs.readFileSync(file2Path, "utf8"));

if (!Array.isArray(file1) || !Array.isArray(file2)) {
  throw new Error("Les deux fichiers doivent contenir un tableau JSON.");
}

if (file1.length !== file2.length) {
  throw new Error("Les deux tableaux doivent avoir la même longueur.");
}

const result = file2.map((item, index) => {
  const source = file1[index];

  return {
    ...item,
    id: source.id,
    name: source.name,
    rarity: source.rarity,
    image: source.image,
    shinyImage: source.shinyImage
  };
});

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");

console.log("Fichier généré :", outputPath);