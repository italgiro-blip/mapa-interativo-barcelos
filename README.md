Mapa Interativo de Barcelos

Olá! Este projeto foi desenvolvido para visualizar e analisar dados estatísticos do município de **Barcelos, Portugal**. A ideia principal foi criar uma ferramenta funcional que facilite a compreensão de indicadores territoriais através de mapas dinâmicos.

### 🌟 O que o projeto oferece?
O diferencial desta aplicação é a capacidade de processar dados em tempo real. Em vez de uma visualização estática, o utilizador pode alternar entre diferentes métodos de classificação, como o algoritmo de **Jenks (Quebras Naturais)**. Isto garante que a divisão das cores no mapa siga uma lógica estatística real, destacando com precisão as variações entre as freguesias.

### 🛠️ Implementação Técnica
* **Leaflet.js:** Utilizado para a renderização eficiente do mapa e das camadas vetoriais.
* **Processamento de Dados:** A lógica foi escrita em **JavaScript (ES6)** para manipular o ficheiro **GeoJSON** e calcular intervalos (Quantis e Intervalos Iguais) instantaneamente no navegador.
* **Interface:** Desenvolvida com HTML5 e CSS3, focada na simplicidade e na experiência do utilizador.

### 📂 Estrutura do Repositório
- `index.html`: Estrutura e interface do utilizador.
- `script_V3.js`: Lógica de cálculo estatístico e controlo do mapa.
- `styles_V3.css`: Estilização e layout responsivo.
- `barcelos.geojson`: Base de dados geográfica do município.

---
Este projeto demonstra a aplicação prática de **Sistemas de Informação Geográfica (SIG)** no desenvolvimento web, focando-se na transformação de dados brutos em informação visual útil.
