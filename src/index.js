import * as axios from 'axios';
import * as vis from 'vis-network';
import * as ethers from 'ethers';
import * as $ from 'jquery';
// import Web3 from 'web3';
// import Web3Modal from 'web3modal';
import ForceGraph3D from '3d-force-graph';

class Diagram {
    constructor(){
        console.log("Constructing...");
        // this.profile_id = new URLSearchParams(window.location.search).get('profile_id');
        // if(typeof this.profile_id == 'undefined')
        this.profile_id = false;
        this.element = document.getElementById("diagram");
        this.graphURL = "https://api.thegraph.com/subgraphs/name/kleros/proof-of-humanity-mainnet";

        this.graphQuery = "{submissions(first:1000){id creationTime submissionTime status registered name vouchees{id} requests{evidence{sender URI}}}}";

        this.graphData = [];
        this.structuredData = [];
        this.ipfs_kleros = "https://ipfs.kleros.io";

        this.ubiAddress = "0xdd1ad9a21ce722c151a836373babe42c868ce9a4";
        this.ubiAbi = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function balanceOf(address) view returns (uint)",
        ]
        // this.ubiContract = new ethers.Contract( this.ubiAddress, this.ubiAbi, this.provider);

        this.minTime = 1615432000;
        this.maxTime = Math.floor(Date.now() / 1000);
        this.selectedTime = this.maxTime;
        // this.setSliderRange();
        this.mode = "day"
    }

    
    setSliderRange(){
        console.log("Setting Slider Range...")
        $('#timewarp').attr('min',  this.minTime);
        $('#timewarp').attr('max',  this.maxTime);
        $('#timewarp').attr('value', this.selectedTime);
        var date = new Date(this.selectedTime * 1000);
        $('#timewarpLabel').html(date.toDateString());
    }


    async connectWallet(){
        console.log("Connecting Wallet...");
        window.ethereum.enable
        this.provider = new ethers.providers.Web3Provider(window.ethereum)
        this.signer = this.provider.getSigner()
        let res = await this.signer.getAddress().then(address=>{
            // console.log(address)
            let lwr = address.toLowerCase();
            let node = this.structuredData.nodes.find(x => x.id === lwr);
            if(typeof node !== 'undefined'){
                // this.showNodeDetails(address)
                const distance = 50;
                const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

                this.threeDGraph.cameraPosition(
                    { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                    node, // lookAt ({ x, y, z })
                    3000  // ms transition duration
                );
            }else{
                console.log("couldnt find node")
            }
        })
    }

    async loadGraphData(){
        console.log("Querying Graph Data...");
        this.graphData = await axios.post(this.graphURL, {query: this.graphQuery})
            .then((response)=>{
                return response.data;
            })
            .catch((error)=>{
                console.log(error);
                return false;
            })
        // console.log("GRAPH DATA : ",this.graphData);
    }

    async singleProfile(){
        console.log("Querying Single User Graph Data...");
        let graphQuery = '{submission(id:"'+this.profile_id+'"){id creationTime submissionTime status registered name vouchees{id} requests{evidence{sender URI}}}}';
        console.log(graphQuery)
        this.graphData = await axios.post(this.graphURL, {query: graphQuery})
            .then((response)=>{
                return response.data;
            })
            .catch((error)=>{
                console.log(error);
                return false;
            })
        // console.log("GRAPH DATA : ",this.graphData);
    }

    async multiLoadGraphData(){
        let id = 0;
        let count = 0;
        let limit = 8000;
        let data = {"submissions":[]};

        while(count <= limit){
            let query = '{submissions(first: 1000, where: {id_gt:"'+id+'"}){id creationTime submissionTime status registered name vouchees{id} requests{evidence{sender URI}}}}';
            console.log(query);
            let response = await axios.post("https://api.thegraph.com/subgraphs/name/kleros/proof-of-humanity-mainnet", {query: query})
                .then((res)=>{
                    console.log(res.data);
                    return res;
                })
                .catch((error)=>{
                    console.log(error);
                    return false;
                })
            if(!response){count = limit+1; return false;}

            for (var i = 0; i < response.data.data.submissions.length; i++) {
               data["submissions"].push(response.data.data.submissions[i]);
            }
            count+=1000;
            id = String(response.data.data.submissions[response.data.data.submissions.length - 1].id);
            // console.log("next i ", i);
            // console.log("next count ", count);
        }
        this.graphData = {"data": data};
    }

    async oldMultiLoadGraphData(){
        let max = 0;
        let inc = 0;

        function makeRequest(i) {
            // console.log("Add promise")
            return new Promise((resolve) => {
                let query = "{submissions(first: 500, skip:"+i+"){id creationTime submissionTime status registered name vouchees{id} requests{evidence{sender URI}}}}";
                let response = axios.post("https://api.thegraph.com/subgraphs/name/kleros/proof-of-humanity-mainnet", {query: query})
                    .then((res)=>{
                        console.log(res.data);
                        return res;
                    })
                    .catch((error)=>{
                        console.log(error);
                        return false;
                    })
                resolve(response);
            });
        }

        async function process(arrayOfPromises) {
            console.time(`process`);
            let responses = await Promise.all(arrayOfPromises);
            let data = {"submissions":[]};

            for(let r of responses) {
                // console.log("RRR", r);
                for (var i = 0; i < r.data.data.submissions.length; i++) {
                   data["submissions"].push(r.data.data.submissions[i]);
                }
            }
            console.timeEnd(`process`);
            return data;
        }

        async function handler() {
            let arrayOfPromises = []
            for(var i = 0; i < max; i+=inc) {
                arrayOfPromises.push(makeRequest(i))
            }
            let data = await process(arrayOfPromises);
            console.log(`processing is complete`);
            return data;
        }

        let data = await handler();
        // console.log("DATA", data);
        this.graphData = {"data": data};
        // console.log("MULTI QUERY GRAPH DATA : ",this.graphData);

    }

    async structureData(){
        console.log("Structuring Data...");
        let nodes = [];
        let edges = [];
        for (var i = 0; i < this.graphData.data.submissions.length; i++) {
            // console.log(this.graphData.data.submissions[i]);
            let submission = this.graphData.data.submissions[i];
            // console.log(submission.name);
            // 
            let node = {
                "id": submission.id,
                "label": submission.name,
                "status": submission.status,
                "registered":submission.registered,
                "requests": submission.requests,
                "creationTime": submission.creationTime,
                "submissionTime": submission.submissionTime,
                "firstName": "",
                "lastName": "",
                "bio": "",
                "image": "img/vouching.png",
                "video": "",
                "balance": 1,
                "color": "orange",
                "hidden": false
            }
            if(node.status == "None" && node.registered == false){
                // console.log("Deleted Node ???", node);
                // node isnt registered, but isnt in vouching, assume deleted?
                node.color = "red";
                node.image = "img/danger.png";
            }else if(node.registered){
                // node is registered
                node.color = "orange";
                node.image = "img/registered.png";
            }else if(node.status =="PendingRegistration"){
                // node isnt registered
                node.color = "purple";
                node.image = "img/pending.png"
            }else{
                node.color = "grey";
            }
            // if(node.registered == false && submission.vouchees.length >0){
            //     console.log(node);
            // }
            
            nodes.push(node);
            
            for (var j = 0; j < submission.vouchees.length; j++) {
                let vouchee = submission.vouchees[j];
                // let edge = {
                //     "from": node.id,
                //     "to": vouchee.id
                // }
                //USES SOURCE TARGET IN 3D NOT TO FROM

                let edge = {
                    "source": node.id,
                    "target": vouchee.id
                }
                // console.log("EDGE", edge)
                edges.push(edge);

                
            }
        }

        // this.structuredData = {"nodes":nodes, "edges":edges};
        // USES "LINKS" FOR 3D not edges

        this.structuredData = {"nodes":nodes, "links":edges};
        // console.log("STRUCTURED DATA : ", this.structuredData); 
        return this.structuredData;
    }


    changeTime(time){
        console.log("Changing Time...");
        this.selectedTime = time;
        this.updateNodeVisibility();
        this.network.setData(this.structuredData);
        this.network.redraw();
        var date = new Date(this.selectedTime * 1000);
        $('#timewarpLabel').html(date.toDateString());
    }

    updateNodeVisibility(){
        console.log("Updating Node Visibility...")
        let active = 0;
        for (var i = 0; i < this.structuredData.nodes.length; i++) {
            if(this.selectedTime >= this.structuredData.nodes[i].creationTime){
                this.structuredData.nodes[i].hidden = false;
                active +=1;
            }else{
                this.structuredData.nodes[i].hidden = true;
            }
        }
        console.log("active:"+active+" at time:"+this.selectedTime);
    }

    draw(data){
        console.log("Drawing...");
        let drawingOptions = {
            nodes: {
                shape: "dot",
                size: 16,
                // color: "purple",
                // parseColor: true,
                shape: "circularImage"
            },
            // physics: {
            //     forceAtlas2Based: {
            //         // gravitationalConstant: -26,
            //         centralGravity: 0.005,
            //         springLength: 200,
            //         springConstant: 0.18,
            //     },
            //     maxVelocity: 200,
            //     solver: "repulsion",
            //     timestep: 0.5,
            //     stabilization: { iterations: 150 }
            // },
            edges: {
                arrows: {
                    to: { enabled: true, scaleFactor: 1, type: "arrow" }
                }
            }
        };
        this.network = new vis.Network(document.getElementById("diagram"), data, drawingOptions);
        // console.log(network);
        // this.registerEvents();
    }

    async draw3D(data){

        this.threeDGraph = ForceGraph3D()
      (document.getElementById('diagram'))
        .graphData(data)
        .backgroundColor("#fffffa")
        .width('100vw')
        .height('100vw')
        .linkColor(() => 'purple')
        .nodeAutoColorBy('status')
        // .nodeThreeObject(node => {
        //   const sprite = new SpriteText(node.label);
        //   sprite.material.depthWrite = false; // make sprite background transparent
        //   sprite.color = node.color;
        //   sprite.textHeight = 8;
        //   return sprite;
        // })

        .nodeLabel(node => `${node.label}`)
        .onNodeClick(node => {
          // this.showNodeDetails(node.id)
          const distance = 100;
          const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

          this.threeDGraph.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
            node, // lookAt ({ x, y, z })
            3000  // ms transition duration
          );
        });

        // this.threeDGraph = ForceGraph3D();
        // this.threeDGraph(document.getElementById("diagram")).graphData(data);
    }

    switchMode(){
        if(this.mode == "day"){
            this.mode = "night"
            $('#mode').html('🌛')
            this.threeDGraph.backgroundColor("#2e3541").linkColor(() => 'skyblue')
        }else{
            this.mode = "day"
            $('#mode').html('🌞')
            this.threeDGraph.backgroundColor("#fffffa").linkColor(() => 'purple')
        }
        // console.log(this.mode+" mode.")
    }

    async getProfile(node){
        
        let res = await axios.get(this.ipfs_kleros+node.requests[0].evidence[0].URI)
            .then(async(response)=>{
                let res2 = await axios.get(this.ipfs_kleros+response.data.fileURI)
                    .then((response)=>{
                        // console.log(response.data);
                        return response.data;
                    })
                    .catch((error)=>{
                        console.log("error loading human's image!");
                        return false;
                    })
                return res2;
            })
            .catch((error)=>{
                console.log("error loading human's image!");
                return false;
            })

        return res;
    }

    // async getUBIBalance(address){
    //     let bal = await this.ubiContract.balanceOf(address).then((res)=>{
    //         console.log(res)
    //         return res.toString();
    //     });
    //     return bal;
        
    // }

    showNodeDetails(nodeID){
        console.log("Finding Node...");
        let node = this.structuredData.nodes.find(x => x.id === nodeID);
        //set the placeholder image between loading
        $('#details_image').attr('src', node.image);
        this.getProfile(node).then((data)=>{
            console.log(data);
            node.firstName = data.firstName;
            node.lastName = data.lastName;
            node.bio = data.bio;
            node.image = this.ipfs_kleros+data.photo;
            node.video = this.ipfs_kleros+data.video;
            $('#details_image').attr('src', node.image);
            $('#details_name').html(node.label);
            $('#details_address').html(node.id);
            $('#details_registered').html(node.registered);
            $('#details_status').html(node.status);
            $('#details_bio').html(node.bio);

            // this.getUBIBalance(nodeID).then((balance)=>{
            //     console.log("bal", balance);
            //     node.balance = balance;
            //     $('#details_ubi').html(balance);
            // })
            //ADD A LINK THROUGH TO PROOFOFHUMANITY.ID PROFILE? 
            $('#sidebar').show();
        });

    }

    // registerEvents(){
    //     console.log("Registering Events...");
    //     this.network.on('click', (params)=>{

    //         $('#sidebar').hide();
    //         if(params.nodes[0]){
    //             this.showNodeDetails(params.nodes[0]);
    //         }
    //     });

    //     // $('#timewarp').show();
    //     // $('#timewarp').on('change', ()=>{
    //     //     this.changeTime($('#timewarp').val());
    //     // })    
    // }

}

//-------------------------------------------------
async function run(){
    let diagram = new Diagram();
    console.log("------------------------------------")
    diagram.multiLoadGraphData().then((graphdata)=>{
        diagram.structureData().then((structureddata)=>{
            diagram.draw3D(structureddata)
            if(userPrefersDark){diagram.switchMode();}
            // $('#find_me').show();
        })
    })
    // $('#sidebar-close').click(()=>{
    //     $('#sidebar').hide();
    // })
    $('#find_me').click(()=>{
        diagram.connectWallet()
    })
    $('#mode').click(()=>{
        diagram.switchMode()
    })

    $('#search-address').on('change', ()=>{
        let add = $('#search-address').val();
        console.log(add.toLowerCase());
        let node = diagram.structuredData.nodes.find(x => x.id === add.toLowerCase());

        if(typeof node !== 'undefined'){
            const distance = 50;
            const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

            diagram.threeDGraph.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                node, // lookAt ({ x, y, z })
                3000  // ms transition duration
            );
            console.log(diagram.threeDGraph)

            // diagram.showNodeDetails(node.id);
        }
    })
}


// const profile_id =  new URLSearchParams(window.location.search).get('profile_id');
// console.log(profile_id)
const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;



console.log("Map of Proof of Humanity Loading...");
run();
