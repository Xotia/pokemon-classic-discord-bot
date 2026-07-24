import { IMAGE_SHOWDOWN_URL, SHINY_IMAGE_SHOWDOWN_URL } from '../../config/url';

export function makeSpriteUrl(name: string) {
  const baseName = name
    .toLowerCase()
    .replace("'", "")
    .replace(".", "")
    .replace(" ", "-");
  return {
    image: `${IMAGE_SHOWDOWN_URL}${baseName}.gif`,
    shinyImage: `${SHINY_IMAGE_SHOWDOWN_URL}${baseName}.gif`,
  };
}
