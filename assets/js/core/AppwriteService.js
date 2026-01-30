
class AppwriteService {
    constructor() {
        // Appwrite classes are globals from the CDN script
        const { Client, Databases, Account, Query } = window.Appwrite;

        this.client = new Client()
            .setEndpoint(ENDPOINT) // defined in config.js
            .setProject(PROJECT_ID); // defined in config.js

        this.databases = new Databases(this.client);
        this.account = new Account(this.client);
        this.Query = Query;

        // Expose globals for legacy compatibility (admin.js, etc.)
        window.client = this.client;
        window.databases = this.databases;
        window.account = this.account;
        window.Query = this.Query;
    }

    async getUser() {
        return await this.account.get();
    }

    async logout() {
        return await this.account.deleteSession('current');
    }

    // Helper for database calls
    async listDocuments(collectionId, queries = []) {
        return await this.databases.listDocuments(DATABASE_ID, collectionId, queries);
    }
}
