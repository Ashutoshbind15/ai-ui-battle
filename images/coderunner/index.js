import client from "./client.js";

const getModelsInfo = async () => {
  const models = await client.config.providers();
  console.log(JSON.stringify(models, null, 2));
};

getModelsInfo();
