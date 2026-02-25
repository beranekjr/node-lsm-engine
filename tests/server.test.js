import { test, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

test('Integração: Deve salvar e recuperar via HTTP', async () => {
    const setRes = await fetch(`${BASE_URL}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'web:01', value: { site: 'google.com' } })
    });
    const setData = await setRes.json();
    expect(setRes.status).toBe(201);
    expect(setData.status).toBe('success');

    // 2. Testando o GET (Busca)
    const getRes = await fetch(`${BASE_URL}/get?key=web:01`);
    const getData = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getData.value.site).toBe('google.com');
});

test('Integração: Stress Test - 100 inserções rápidas', async () => {
    const promises = [];
    
    for (let i = 0; i < 100; i++) {
        promises.push(
            fetch(`${BASE_URL}/set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: `stress:${i}`, value: i })
            })
        );
    }

    const results = await Promise.all(promises);
    const allOk = results.every(res => res.status === 201);
    
    expect(allOk).toBe(true);
});

test('Integração: Deve retornar 404 para chaves inexistentes', async () => {
    const res = await fetch(`${BASE_URL}/get?key=chave_fantasma`);
    expect(res.status).toBe(404);
});