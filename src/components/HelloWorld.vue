<template>
  <div class="hello">
    <h3 style="color:red">透過 Remix 部署智能合約，並將合約 address 貼到專案內</h3>
    <!-- <button @click="deploySmartContract">部署智能合約</button> -->
    <h1>合約地址： {{ contAddress }} </h1>
    <h3>上傳檔案到IPFS</h3>
    <br/>
    <input type="file" id="input" @change="handleFiles">
    <h1 v-if="step1">檔案內容: {{ fileContent }}</h1>
    <h1 v-if="step1">加密方法：AES</h1>
    <h1 v-if="step1">密文：{{ecryptContent}}</h1>
    <h1 v-if="step1">IPFS Path: {{ filePath }}</h1>
    <h1 v-if="step1">簽章： {{ signature }}</h1>
    <!-- <button v-if="step1" @click="setMethods">將 hash值 及 簽章 寫到區塊鏈</button> -->
    <h3 v-if="step1" style="color:red">透過 Remix 將 hash值 及 簽章 寫到區塊鏈 => 使用 set() 方法</h3>
    <h1 v-if="step2">檔案已經寫入到區塊鏈</h1>
    <p></p>
    <div class="table-center">
      <table v-if="step1">
        <thead>
            <tr>
                <th>index</th>
                <th>file name</th>
            </tr>
        </thead>
        <tbody>
            <tr class="tr2" @click="getMethods(filename)">
                <td>1</td>
                <td>{{filename}}</td>
            </tr>
        </tbody>
      </table>
    </div>
    <h1 v-if="step1"><span style="color:red">signature:</span> {{ content[0] }},<br/><span style="color:red"> ipfs hash path:</span> {{ content[1] }}</h1>
    <input v-if="step3" type="text" id="input" v-model="inputText">
    <button v-if="step3" @click="getIpfsHash()">取得IPFS中的檔案(IPFS Hash)</button>
    <h1 v-if="step4">檔案： {{ decodeipfshash }}</h1>
    <button v-if="step4" @click="decrypt()">解密</button>
    <h1 v-if="step5">解密後： {{ decryptContent }}</h1>
    <button v-if="step5" @click="verifySignature()">驗證</button>
    <h1 v-if="step6">{{ isVerify }}</h1>
  </div>
</template>

<script>
import { JSEncrypt } from 'jsencrypt'
const CryptoJS = require('crypto-js')
const Web3 = require('web3')
const web3 = new Web3('http://localhost:8545')
const forge = require('node-forge')
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient('http://localhost:5001')

export default {
  name: 'HelloWorld',
  data () {
    return {
      filePath: '',
      contAddress: '0xA5F5598F45D898fb54D275fa337793756904E0C9',
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
      step6: false,
      pemPublic: '',
      pemPrivate: '',
      content: [],
      ecryptContent: '',
      decryptContent: '',
      signature: '',
      fileContent: '',
      filename: '',
      inputText: '',
      isVerify: false,
      decodeipfshash: ''
    }
  },
  methods: {
    async getIpfsHash () {
      const chunks = []
      const text = this.inputText
      for await (const chunk of ipfs.cat(text)) {
        chunks.push(chunk)
      }
      console.log('Added file contents:', chunks)
      const utf8decoder = new TextDecoder()
      this.step4 = true
      this.decodeipfshash = utf8decoder.decode(chunks[0])
    },
    async sendtoIPFS (secretText) {
      const { cid } = await ipfs.add(secretText)
      this.step1 = true
      this.filePath = cid.string
    },
    async handleFiles (element) {
      const file = element.target.files[0]
      this.filename = file.name
      console.log(file)
      // 讀取檔案內容
      const reader = new FileReader()
      // reader.readAsDataURL(file)
      reader.readAsText(file, 'utf-8')
      let result = ''
      const $ = this
      reader.onload = function (e) {
        console.log(reader.result)
        result = reader.result
        // 對內容簽章
        $.fileContent = result
        console.log('fileContent ' + $.fileContent)
        $.createSignature(result)
        $.encrypt(result)
      }
    },
    encrypt (text) { // 加密方法
      this.ecryptContent = this.CryptoJS.AES.encrypt(text, 'Secret Passphrase').toString()
      // 上傳至IPFS
      this.sendtoIPFS(this.ecryptContent)
    },
    decrypt () { // 解密方法
      console.log('decrypt  this.ecryptContent ' + this.ecryptContent)
      this.decryptContent = this.CryptoJS.AES.decrypt(this.ecryptContent, 'Secret Passphrase').toString(this.CryptoJS.enc.Utf8)
      this.step5 = true
    },
    async deploySmartContract () {
      const json = require('../contracts/SimpleStorage.json')
      const accounts = await web3.eth.getAccounts()
      console.log(accounts[1])
      web3.eth.getBalance(accounts[1]).then(console.log)
      const myContract = await new web3.eth.Contract(json.abi)
      await myContract.deploy({
        data: json.bytecode
      })
        .send({
          from: accounts[1],
          gas: 1500000,
          gasPrice: '3000000000000'
        })
        .on('error', function (error) {
          console.log('error ' + error)
        })
        .on('receipt', function (receipt) {
          const contAddress = receipt.contractAddress
          myContract.options.address = contAddress
          console.log('contAddress ' + contAddress)
        })
        .then(function (newContractInstance) {
          console.log('3: ' + newContractInstance.options.address) // instance with the new contract address
        })
    },
    async setMethods () {
      const accounts = await web3.eth.getAccounts()
      const contAddress = this.contAddress
      const json = require('../contracts/SimpleStorage.json')
      const myContract = await new web3.eth.Contract(json.abi, contAddress, { from: accounts[1] })
      const result4 = await myContract.methods.set(this.filename, this.signature, this.filePath).send({ from: accounts[1] })
      console.log(result4)
      this.step2 = true
    },
    async getMethods (filename) {
      const accounts = await web3.eth.getAccounts()
      const contAddress = this.contAddress
      const json = require('../contracts/SimpleStorage.json')
      const myContract = await new web3.eth.Contract(json.abi, contAddress, { from: accounts[1] })
      const result5 = await myContract.methods.get(filename).call()
      this.step3 = true
      this.content = result5
    },
    createKey () {
      const rsa = forge.pki.rsa
      const pki = forge.pki
      // 使用 synchronously 產生 keypair
      const keypair = rsa.generateKeyPair({ bits: 1024, e: 0x10001 })
      // 轉換 Forge key to PEM-格式
      this.pemPublic = pki.publicKeyToPem(keypair.publicKey)
      this.pemPrivate = pki.privateKeyToPem(keypair.privateKey)
    },
    async createSignature (text) {
      // Sign with the private key...
      const sign = new JSEncrypt()
      sign.setPrivateKey(this.pemPrivate)
      console.log('text ' + text)
      this.signature = await sign.sign(text, CryptoJS.SHA256, 'sha256')
      console.log('signature ' + this.signature)
    },
    verifySignature () {
      // Decrypt with the private key
      var verify = new JSEncrypt()
      verify.setPublicKey(this.pemPublic)
      console.log('fileContent ' + this.fileContent)
      console.log('signature ' + this.signature)
      this.isVerify = verify.verify(this.fileContent, this.signature, CryptoJS.SHA256)
      console.log('isVerify ' + this.isVerify)
      this.step6 = true
    },
    createAccount () {
      const hi = web3.eth.personal.importRawKey('e22f66adf65b29f447d10a982fdf31c818f84f8a8124ce17f912ad3d39accf01', 'qwer5678')
      console.log(hi)
    }
  },
  async created () {
    await this.createKey()
    const accounts = await web3.eth.getAccounts()
    // console.log(accounts[1])
    // web3.eth.getBalance(accounts[1]).then(console.log)
    web3.eth.personal.unlockAccount(accounts[1], 'qwer5678', 157680000)
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
table {width: 50%;}
.table-center{
  display: flex;
  justify-content: center;}
table {
  border: 1px solid #333;
}
table .tr2:hover {cursor: pointer; color: red;}
thead,
tfoot {
  background-color: #ccc;
  color: #000;
}

</style>
