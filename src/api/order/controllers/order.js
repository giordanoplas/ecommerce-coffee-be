'use strict';

//@ts-ignore
const stripe = require("stripe")(process.env.STRIPE_KEY);

/**
 * order controller
 */

// @ts-ignore
const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::order.order');
module.exports = createCoreController('api::order.order', ({ strapi }) => ({
    async create(ctx) {
        //@ts-ignore
        const { products } = ctx.request.body;
        //console.log(products);

        try {
            const lineItems = await Promise.all(
                products.map(async (product) => {
                    //@ts-ignore
                    const item = await strapi.service('api::product.product').find();
                    const itemArgs = item.results.filter(arg => arg.id === product.id)[0];

                    //console.log(itemArgs);

                    return {
                        price_data: {
                            currency: "USD",
                            product_data: {
                                name: itemArgs.productName
                            },
                            unit_amount: Math.round(itemArgs.price * 100)
                        },
                        quantity: 1
                    }
                })
            );

            const session = await stripe.checkout.sessions.create({
                shipping_address_collection: { allowed_countries: ["US"] },
                payment_method_types: ["card"],
                mode: "payment",
                success_url: process.env.CLIENT_URL + "/success",
                cancel_url: process.env.CLIENT_URL + "/successError",
                line_items: lineItems,
            });

            await strapi
                .service("api::order.order")
                .create({ data: { products, stripeId: session.id } });

            return { stripeSession: session };
        } catch (error) {
            ctx.response.status = 500;
            //console.log(error);
            return { error }
        }
    }
}));