import bjorkPost from "./bjork_post.json";
import ladyGagaTheFame from "./lady_gaga_the_fame.json";
import glassAnimalsHowToBeAMHumanBeing from "./glass_animals_how_to_be.json";

const albums = [bjorkPost, ladyGagaTheFame, glassAnimalsHowToBeAMHumanBeing];

const artificialWait = (ms = 1500) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function getAll() {
  await artificialWait();
  return albums;
}

export async function getById(id) {
  await artificialWait();
  return albums.find((album) => album.id === id);
}
