const BlockDetailQueue = require("./blockDetail").BlockDetailQueue

function main(block_arr) {
  let testnet = `https://rinkeby.infura.io/${process.env.INFURA_ACCESS_TOKEN}`
  let blockQueueName = 'Block Queue'
  let txnQueueName = 'Ethereum Queue'
  let dirPath = './block-transaction';
  let enableLog = true
  const bdq = new BlockDetailQueue(blockQueueName, txnQueueName, testnet, dirPath, enableLog)
  bdq.main(block_arr)
}

let block_arr = ["0xd6138375419d0d82e333b2e84998f88eb42563dcf46cbfa19eefbecdcd5935e7",
  "0xcb7695375b0948528396db9a4377923b857de1823273585fa70fca3e7fc8b19d",
  "0x8e4ec07e3f9de5faf12fa9e25afe86a9830dbea20d95c18b7a7d7c951619f7e5"
]
main(block_arr)
