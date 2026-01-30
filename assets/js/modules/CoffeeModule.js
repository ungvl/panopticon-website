
class CoffeeModule {
    constructor(appwriteService) {
        this.db = appwriteService;
    }

    async init() {
        if (document.getElementById('coffee-count')) {
            await this.fetchCount();
        }
    }

    async fetchCount() {
        try {
            const response = await this.db.listDocuments(
                COLLECTIONS.COFFEE,
                [this.db.Query.limit(100)]
            );
            const el = document.getElementById('coffee-count');
            if (el) el.innerText = response.total;
        } catch (err) {
            const el = document.getElementById('coffee-count');
            if (el) el.innerText = "0";
        }
    }
}
