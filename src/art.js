import imageManifest from "./productImages.json";

export function categoryPhoto(category, imageUrl = "") {
  if (imageUrl) return { src: imageUrl, alt: `${category} category` };
  const image = imageManifest.categories[category];
  return image
    ? { src: `/images/catalog/${image.file}`, alt: image.alt }
    : { src: "/images/coffee-hero.jpg", alt: "Coffee beans and ground coffee" };
}

export function productPhoto(product) {
  if (product.imageUrl) {
    return { src: product.imageUrl, alt: product.n || "Store product" };
  }
  const image = imageManifest.products[product.id];
  return image
    ? { src: `/images/products/${image.file}`, alt: image.alt }
    : categoryPhoto(product.cat);
}
