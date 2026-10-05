import imageManifest from "./productImages.json";

export function categoryPhoto(category) {
  const image = imageManifest.categories[category];
  return image
    ? { src: `/images/catalog/${image.file}`, alt: image.alt }
    : { src: "/images/coffee-hero.jpg", alt: "Coffee beans and ground coffee" };
}

export function productPhoto(product) {
  const image = imageManifest.products[product.id];
  return image
    ? { src: `/images/products/${image.file}`, alt: image.alt }
    : categoryPhoto(product.cat);
}
