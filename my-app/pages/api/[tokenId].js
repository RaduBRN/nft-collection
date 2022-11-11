const handler = (req, res) => {
  // get tokenId from query params
  const tokenId = req.query.tokenId;

  // because images are uploaded on github, we extract images from github directly
  const image_url =
    "https://raw.githubusercontent.com/LearnWeb3DAO/NFT-Collection/main/my-app/public/cryptodevs/";

  // the api is sending back metadata for a Crypto Dev
  // in order to make collection compatible with Opensea, we follow metadata standards when sending back the response from api
  res.status(200).json({
    name: "Crypto Dev #" + tokenId,
    description: "Crypto Dev is a collection of developers in crypto",
    image: image_url + tokenId + ".svg",
  });
};

export default handler;
