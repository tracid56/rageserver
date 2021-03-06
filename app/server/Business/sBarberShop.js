"use strict"

const business = require('./sBusiness');
const misc = require('../sMisc');
const headOverlay = require('../Character/sHeadOverlay');
const moneyAPI = require('../Basic/sMoney');
const i18n = require('../sI18n');


class clothingShop extends business {
    constructor(d) {
		super(d);
		this.camData = JSON.parse(d.camData);
    }
	
	setLocalSettings() {
		this.blip.model = 71;
		this.blip.name = `Barber shop`;
	}
	
	openBuyerMenu(player) {
		if (player.vehicle) return;
		const d = this.buyerMenuCoord;
		player.position = new mp.Vector3(d.x, d.y, d.z);
		player.heading = d.rot;

		let gender;
		if (player.model === 1885233650) gender = `app.loadMans();`;
		else gender = `app.loadWomans();`;

		const str1 = `app.id = ${this.id};`;
		const str2 = `app.margin = ${this.margin};`;
		const str3 = `app.camRotation = ${player.heading};`;

		let execute = str1 + str2 + str3 + gender;
	
		player.call("cBarberShop-ShowBuyerMenu", [player.lang, execute, this.camData]);
		misc.log.debug(`${player.name} enter a barber shop menu`);
	}

	async updateCamData(player) {
		const pos = player.position;
		const obj = {
			x: misc.roundNum(pos.x, 2),
			y: misc.roundNum(pos.y, 2),
			z: misc.roundNum(pos.z + 0.70, 2),
			rz: misc.roundNum(player.heading, 2),
			viewangle: 20,
		}
		const data = JSON.stringify(obj);
		await misc.query(`UPDATE barbershop SET camData = '${data}' WHERE id = ${this.id}`);
		this.camData = obj;

		player.notify(`~g~${i18n.get('basic', 'success', player.lang)}!`);
	}

	async buyThing(player, d) {
		const price = this.getPrice(d);
		const shopTax = misc.roundNum(price * this.margin / 100);
		const endPrice = price + shopTax;
		const canBuy = await moneyAPI.changeMoney(player, -endPrice);
		if (!canBuy) return;
		await this.addMoneyToBalance(shopTax);
		await headOverlay.saveHeadOverlay(player, d);
		player.notify(`~g~${i18n.get('basic', 'success', player.lang)}!`);
		misc.log.debug(`${player.name} bought something in barbershop for $${endPrice}`);
	}

	getPrice(d) {
		let price;
		if (misc.isValueNumber(d.hairStyle)) price = 2500;
		else if (misc.isValueNumber(d.hairCol1) && misc.isValueNumber(d.hairCol2)) price = 1500;
		else if (misc.isValueNumber(d.browStyle) && misc.isValueNumber(d.browOp)) price = 1000;
		else if (misc.isValueNumber(d.beardStyle) && misc.isValueNumber(d.beardOp)) price = 500;
		return price;
	}

}


function createBarberShop(d) {
	const shop = new clothingShop(d);
	shop.createMainEntities();
	shop.createBuyerEntities();
	shop.setLocalSettings();
	business.addNewBusinessToList(shop);
}

async function loadBarberShops() {
	const d = await misc.query("SELECT * FROM business INNER JOIN barbershop ON business.id = barbershop.id");
	for (let i = 0; i < d.length; i++) {
		createBarberShop(d[i]);
	}
}
loadBarberShops();



mp.events.add({
	"sBarberShop-SetHairStyle" : (player, index) => {
		player.setClothes(2, index, 0, 0);
	},

	"sBarberShop-SetHeadOverlay" : (player, obj) => {
		const d = JSON.parse(obj);
		player.setHeadOverlay(d.id, [d.index, d.opacity, 1, 1]);
	},

	"sBarberShop-BuyThing" : (player, data) => {
		const d = JSON.parse(data);
		const shop = business.getBusiness(d.id);
		shop.buyThing(player, d);
	},

	"sBarberShop-ReloadHeadOverlay" : (player) => {
		headOverlay.loadPlayerHeadOverlay(player);
	},
});

mp.events.addCommand({
	'createbarbershop' : async (player, enteredprice) => {
		if (misc.getAdminLvl(player) < 1) return;
		const id = business.getCountOfBusinesses() + 1;
		const coord = misc.convertOBJToJSON(player.position, player.heading);
		const price = Number(enteredprice.replace(/\D+/g,""));
		const query1 = misc.query(`INSERT INTO business (title, coord, price) VALUES ('Barber Shop', '${coord}', '${price}');`);
		const query2 = misc.query(`INSERT INTO barbershop (id) VALUES ('${id}');`);	
		await Promise.all([query1, query2]);
		player.outputChatBox("!{#4caf50} Barber shop successfully created!");
	},	

	'setbscamdata' : async (player, fullText, id) => {
		if (misc.getAdminLvl(player) < 1) return;
		const shop = business.getBusiness(+id);
		shop.updateCamData(player);
	},	

});
