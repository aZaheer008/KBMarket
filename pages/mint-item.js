import {ethers} from 'ethers'
import {useState} from 'react'
import Web3Modal from 'web3modal'
import axios from 'axios'
import {create as ipfsHttpClient} from 'ipfs-http-client'
import { nftaddress, nftmarketaddress } from '../config'
import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import {useRouter} from 'next/router'
import KBMarket from '../artifacts/contracts/KBMarket.sol/KBMarket.json';

// in this component we set the ipfs up to host our nft data of
// file storage 

// const client = ipfsHttpClient(`https://ipfs.infura.io:5001/api/v0/${projectId}`)

const auth = 'Basic ' + Buffer.from(projectId+':'+projectSecret).toString('base64');

const client = ipfsHttpClient({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth,
    },
});

export default function MintItem() {
    const [fileUrl, setFileUrl] = useState(null)
    const [formInput, updateFormInput] = useState({price: '', name:'',description:''});
    const router = useRouter()


    // set up a function to fireoff when we update files in our form - we can add our 
    // NFT images - IPFS

    async function onChange(e) {

        const file = e.target.files[0];
        const buffer1 = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer1);
        const buffer = Buffer.from(Object.values(bytes));
        const blob = new Blob([buffer]);
        const formData = new FormData();

        formData.append(
            "file",
            blob, {
                contentType : file.type,
                filename : JSON.stringify(file.name + '-' + new Date().toISOString())
            }
        );

        const fileRes = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
            maxBodyLength : Infinity,
            headers : {
                "Content-Type" : `multipart/form-data;`,
                pinata_api_key : process.env.PINATA_API_KEY,
                pinata_secret_api_key : process.env.PINATA_SECRET_API_KEY
            }
        });
        console.log("--image---fileRes---",fileRes);
        const url = `https://gateway.pinata.cloud/ipfs/${fileRes.data.IpfsHash}`;
        setFileUrl(url);
    }

    async function createMarket() {
        const {name, description, price} = formInput 
        if(!name || !description || !price || !fileUrl) return 
        // upload to IPFS
        const data = JSON.stringify({
            name, description, image: fileUrl
        })
        try {
            const nft = {
                name, description, price,image: fileUrl
            };
            const jsonRes = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
                pinataMetadata : {
                    name : JSON.stringify(new Date().toISOString()),
                },
                pinataContent : nft
            }, {
                headers : {
                    pinata_api_key : process.env.PINATA_API_KEY,
                    pinata_secret_api_key : process.env.PINATA_SECRET_API_KEY
                }
            });
            console.log("--90--meta---jsonRes---",jsonRes);
            const url = `https://gateway.pinata.cloud/ipfs/${jsonRes.data.IpfsHash}`
            // run a function that creates sale and passes in the url 
            createSale(url)
            } catch (error) {
                console.log('Error uploading file:', error)
            }
    }

    async function createSale(url) {
        // create the items and list them on the marketplace
        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()

        // we want to create the token
        let contract = new ethers.Contract(nftaddress, NFT.abi, signer)
        let transaction = await contract.mintToken(url)
        let tx = await transaction.wait()
        let event = tx.events[0]
        let value = event.args[2]
        let tokenId = value.toNumber()
        const price = ethers.utils.parseUnits(formInput.price, 'ether')
        
        // list the item for sale on the marketplace 
        contract = new ethers.Contract(nftmarketaddress, KBMarket.abi, signer)
        let listingPrice = await contract.getListingPrice()
        listingPrice = listingPrice.toString()

        transaction = await contract.makeMarketItem(nftaddress, tokenId, price, {value: listingPrice})
        await transaction.wait()
        router.push('./')
    }

    return (
        <div className='flex justify-center'>
            <div className='w-1/2 flex flex-col pb-12'>
                <div>
                    <input
                    placeholder='Asset Name'
                    className='mt-8 border rounded p-4'
                    onChange={ e => updateFormInput({...formInput, name: e.target.value})} 
                    />
                </div>
                <div>
                    <textarea
                    placeholder='Asset Description'
                    className='mt-2 border rounded p-4'
                    onChange={ e => updateFormInput({...formInput, description: e.target.value})} 
                    />
                </div>
                <input
                placeholder='Asset Price in Eth'
                className='mt-2 border rounded p-4'
                onChange={ e => updateFormInput({...formInput, price: e.target.value})} 
                />
                <input
                type='file'
                name='Asset'
                className='mt-4'
                onChange={onChange} 
                /> {
                fileUrl && (
                    <img className='rounded mt-4' width='350px' src={fileUrl} />
                )}
                <button onClick={createMarket}
                className='font-bold mt-4 bg-purple-500 text-white rounded p-4 shadow-lg'
                >
                    Mint NFT
                </button>
            </div>
        </div>
    )

}