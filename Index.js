const express = require('express');
const axios = require('axios');
const app = express();
const port = 5000;



const login = async () => {
    try {
        const login = await axios.post('http://20.244.56.144/test/auth', {
            "companyName": "AbhayCompany",
            "clientID": "a3e6b125-f4b4-47e6-a652-1113be473f21",
            "clientSecret": "VrJBfkjWxTSZZocF",
            "ownerName": "Abhay Kumar Singh",
            "ownerEmail": "21ec065@jssaten.ac.in",
            "rollNo": "2100910310003"
        })

        return login.data.access_token;
    } catch (error) {
        console.log(error.messages)
    }

}

const TEST_API_BASE_URL = 'http://20.244.56.144/test/companies';

const COMPANIES = ["AMZ", "FLP", "SNP", "MYN", "AZO"];
const CATEGORIES = ["Phone", "Computer", "TV", "Earphone", "Tablet", "Charger", "Mouse", "Keypad", "Bluetooth", "Pendrive", "Remote", "Speaker", "Headset", "Laptop", "PC"];

app.get('/categories/:categoryname/products', async (req, res) => {
    const { categoryname } = req.params;
    let { top, page, minPrice, maxPrice, sortBy, sortOrder } = req.query;
    top = parseInt(top);
    page = parseInt(page) || 1;
    minPrice = parseFloat(minPrice) || 0;
    maxPrice = parseFloat(maxPrice) || Number.MAX_VALUE;
    sortOrder = sortOrder === 'desc' ? -1 : 1;

    if (!CATEGORIES.includes(categoryname)) {
        return res.status(400).json({ error: 'Invalid category name' });
    }

    if (isNaN(top) || top <= 0) {
        return res.status(400).json({ error: 'Invalid number of products requested' });
    }
    const token = await login();
    if (!token) {
        return res.status(500).json({ error: 'Failed to obtain access token' });
    }
    const requests = COMPANIES.map((company) => {
        const url = `${TEST_API_BASE_URL}/${company}/categories/${categoryname}/products?top=${top}&minPrice=${minPrice}&maxPrice=${maxPrice}`;
        return axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }).then(response => response.data).catch((err) => console.log(err.messages));
    });

    try {
        const results = await Promise.all(requests);
        const products = results.flat().map(product => ({
            id: generateUniqueId(product),
            ...product
        }));

        const sortedProducts = sortProducts(products, sortBy, sortOrder);

        const paginatedProducts = paginate(sortedProducts, top, page);
        res.json(paginatedProducts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products from the e-commerce server' });
    }
});

app.get('/categories/:categoryname/products/:productid', async (req, res) => {
    const { categoryname, productid } = req.params;
    const { company } = req.query;
    if (!COMPANIES.includes(company)) {
        return res.status(400).json({ error: 'Invalid company name' });
    }

    const url = `${TEST_API_BASE_URL}/${company}/categories/${categoryname}/products`;
    const token = await login();
    if (!token) {
        return res.status(500).json({ error: 'Failed to obtain access token' });
    }
    try {
        const response = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const product = response.data.find(p => generateUniqueId(p) === productid);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product details from the e-commerce server' });
    }
});

function generateUniqueId(product) {
    return `${product.productName}-${product.price}-${product.rating}-${product.discount}`;
}

function sortProducts(products, sortBy, sortOrder) {
    if (!sortBy) return products;
    return products.sort((a, b) => (a[sortBy] > b[sortBy] ? sortOrder : -sortOrder));
}

function paginate(items, pageSize, pageNumber) {
    return items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
