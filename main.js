let blockDetail = require("./blockDetail")

async function main(block_arr) {
  let testnet = `https://rinkeby.infura.io/${process.env.INFURA_ACCESS_TOKEN}`
  let transArray = {}
  const bd = new blockDetail('Ethereum Queue', testnet)
  block_arr.forEach(async address => {
    transArray[address] = []
    let transactions = await bd.getBlockDetail(address)
    bd.addQueue(address, transactions, bdInstance.transactionQueue)
  });
  bd.processTransaction(transArray, bdInstance.transactionQueue)
  bd.queueCompletion(bdInstance.transactionQueue)
}

let block_arr = ["0xd6138375419d0d82e333b2e84998f88eb42563dcf46cbfa19eefbecdcd5935e7",
  "0xcb7695375b0948528396db9a4377923b857de1823273585fa70fca3e7fc8b19d",
  "0x8e4ec07e3f9de5faf12fa9e25afe86a9830dbea20d95c18b7a7d7c951619f7e5"
]
main(block_arr)