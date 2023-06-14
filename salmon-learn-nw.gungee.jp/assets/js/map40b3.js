(() => {

const dragger = {}
function init_draggable() {
  // 画像をドラッグで移動させる
  $("#map_event_layer").addEventListener("pointermove", (e) => {
    if (dragger.dragging_obj) {
      const dx = e.offsetX - dragger.start_x
      const dy = e.offsetY - dragger.start_y
      const new_x = dragger.dragging_obj_start_x + dx
      const new_y = dragger.dragging_obj_start_y + dy
      dragger.dragging_obj.set_xy(new_x, new_y)
      return
    }
    if (!!mousebutton_map["1"]) {
      const rotated = rotate(e.movementX, e.movementY, -transformer.user.angle)
      transformer.user.x += rotated.x
      transformer.user.y += rotated.y
      transformer.user.update_css()
      transformer.update_scale()
      return
    }
    if (!!mousebutton_map["2"]) {
      const cx = fitter.cache.main.width / 2
      const cy = fitter.cache.header.height + fitter.cache.main.height / 2
      const cur_polar = to_polar(e.screenX - cx, e.screenY - cy)
      const cur_angle = cur_polar.theta
      const f = mousebutton_map["2"]
      const cur_polar_start = to_polar(f.screenX - cx, f.screenY - cy)
      const cur_angle_start = cur_polar_start.theta
      const delta_angle = cur_angle - cur_angle_start
      transformer.user.angle += delta_angle
      transformer.user.update_css()
      mousebutton_map["2"] = e
      transformer.update_scale()
    }
  })

  // 画像のドラッグを終了する
  $("#map_event_layer").addEventListener("pointerup", async (e) => {
    dragger.dragging_obj = null
    $("#map_wrapper").classList.remove("dragging")
  })
}

class DraggableImage {
  constructor(options) {
    this.x = 0
    this.y = 0
    this.scale = 1
    this.angle = 0
    this.shadow_color = "rgba(0, 0, 0, 0.3)"
    this.shadow_angle = 45
    this.shadow_size = 16
    this.shadow_blur = 10
    this.init_xy(options.x, options.y, async (pos) => {
      this.x = pos.x
      this.y = pos.y
      // const element = document.createElement("img")
      // element.src = options.src
      const element = await create_edge_image(options.src)
      if (options.title) {
        element.setAttribute("title", options.title)
        element.setAttribute("alt", options.title)
      }
      element.style.setProperty("left", `${pos.x}px`)
      element.style.setProperty("top", `${pos.y}px`)
      element.classList.add("map-user-obj")
      if (options.classname) {
        element.classList.add(options.classname)
      }
      element.addEventListener("pointerdown", async (e) => {
        e.preventDefault()
        dragger.dragging_obj = this
        dragger.dragging_obj_start_x = this.x
        dragger.dragging_obj_start_y = this.y
        const offset = await parse_to_offset_xy(e.clientX, e.clientY)
        dragger.start_x = offset.x
        dragger.start_y = offset.y
        $("#map_wrapper").classList.add("dragging")
      })
      element.addEventListener("pointermove", async (e) => {
        if (dragger.dragging_obj) {
          const offset = await parse_to_offset_xy(e.clientX, e.clientY)
          const dx = offset.x - dragger.start_x
          const dy = offset.y - dragger.start_y
          const new_x = dragger.dragging_obj_start_x + dx
          const new_y = dragger.dragging_obj_start_y + dy
          dragger.dragging_obj.set_xy(new_x, new_y)
          e.stopPropagation()
        }
      })
      element.addEventListener("pointerup", async (e) => {
        if (dragger.dragging_obj) {
          dragger.dragging_obj = null
          $("#map_wrapper").classList.remove("dragging")
        }
      })
      this.element = element
      this.element.drag_object = this
      this.update_transform()
      $("#map_user_obj_wrapper").appendChild(element)
    })
  }

  init_xy(x, y, callback) {
    if (x !== undefined && y !== undefined) {
      callback({ x, y })
    } else {
      parse_to_offset_xy(window.innerWidth / 2, window.innerHeight / 2).then(
        (pos) => {
          const x = pos.x - 1920
          const y = pos.y - 1920
          callback({ x, y })
        },
      )
    }
  }

  set_xy(x, y) {
    this.x = x
    this.y = y
    this.element.style.setProperty("left", `${x}px`)
    this.element.style.setProperty("top", `${y}px`)
  }

  get_xy(x, y) {
    return {
      x: this.x,
      y: this.y,
    }
  }

  update_transform() {
    const scale =
      (1.5 * this.scale) / (transformer.stage.scale * transformer.user.scale)
    const angle =
      this.angle - (transformer.stage.angle + transformer.user.angle)
    this.element.style.setProperty(
      "transform",
      `translate(-50%, -50%) scale(${scale}) rotate(${angle}deg)`,
    )

    const sa = this.shadow_angle
    const sb = this.shadow_blur
    const sxy = rotate(this.shadow_size, 0, sa)
    const sx = sxy.x
    const sy = sxy.y
    this.element.style.setProperty(
      "filter",
      `drop-shadow(${sx}px ${sy}px ${sb}px ${this.shadow_color})`,
    )
  }

  bordering() {
    const n = 4
    const r = 0.2
    const css_list = []
    const css_list_2 = []
    const uni = "rem"
    const col = "black"
    const col_2 = "white"
    for (let i = 0; i < n; i++) {
      const angle = (i * 180) / n
      const { x, y } = rotate(r, 0, angle)
      css_list.push(`drop-shadow(${x}${uni} ${y}${uni} 0 ${col})`)
      css_list.push(`drop-shadow(${-x}${uni} ${-y}${uni} 0 ${col})`)
      css_list_2.push(`drop-shadow(${x}${uni} ${y}${uni} 0 ${col_2})`)
      css_list_2.push(`drop-shadow(${-x}${uni} ${-y}${uni} 0 ${col_2})`)
    }
    this.element.style.setProperty(
      "filter",
      css_list.join(" ") + " " + css_list_2.join(" "),
    )
  }
}

const STAGE_NAMES = [
  "Shakespiral",
  "Shakedent",
  "Shakeup",
  "Shakeship",
  "Carousel",
]

const WEAPON_IDS = [
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 210, 220, 230, 240, 250, 300,
  310, 400, 1000, 1010, 1020, 1030, 1040, 1100, 1110, 2000, 2010, 2030, 2050,
  2060, 2070, 3000, 3010, 3020, 3030, 3040, 4000, 4010, 4020, 4030, 4040, 5000,
  5010, 5020, 5030, 5040, 6000, 6010, 6020, 7010, 7020, 8000, 8010, 9000, 9010,
  9020, 9030, 9040, 9050, 10000,
]

const ICON_FILENAMES = [
  "Enm_Smallfry_icon.png",
  "Enm_Chum_icon.png",
  "Enm_Chum_Rush_icon.png",
  "Enm_Cohock_icon.png",
  "Enm_Cohozuna_icon.png",
  "Enm_Chinook_icon.png",
  "Enm_Snatcher_icon.png",
  "Enm_Steelhead_icon.png",
  "Enm_Flyfish_icon.png",
  "Enm_Scrapper_icon.png",
  "Enm_Steel_Eel_icon.png",
  "Enm_Stinger_icon.png",
  "Enm_Maws_icon.png",
  "Enm_Drizzler_icon.png",
  "Enm_Fish_Stick_icon.png",
  "Enm_Flipper-Flopper_icon.png",
  "Enm_Big_Shot_icon.png",
  "Enm_Big_Shot_Gun_icon.png",
  "Enm_Slammin'_Lid_icon.png",
  "Enm_Goldie_icon.png",
  "Enm_Griller_icon.png",
  "Enm_Mudmouth_icon.png",
  "Enm_Mudmouth_Golden_icon.png",
  "Enm_Tornado_Box_icon.png",
  "Label_A.svg",
  "Label_B.svg",
  "Label_C.svg",
  "Label_1.svg",
  "Label_2.svg",
  "Label_3.svg",
  "Golden_Egg_1.png",
  "Golden_Egg_2.png",
  "Golden_Egg_3.png",
  "Golden_Egg_4.png",
  "Golden_Egg_5.png",
  "Golden_Egg_6.png",
  "Golden_Egg_7.png",
  "Golden_Egg_8.png",
  "Golden_Egg_9.png",
  "Golden_Egg_10.png",
  "Player_Squid_1.png",
  "Player_Squid_2.png",
  "Player_Squid_3.png",
  "Player_Squid_4.png",
  "Player_Squid_5.png",
  "Player_Squid_6.png",
  "Player_Squid_7.png",
  "Player_Octo_1.png",
  "Player_Octo_2.png",
  "Player_Octo_3.png",
  "Player_Octo_4.png",
  "Player_Octo_5.png",
  "Player_Octo_6.png",
  "Player_Octo_7.png",
  "Sp_Chariot.png",
  "Sp_Jetpack.png",
  "Sp_MicroLaser.png",
  "Sp_NiceBall.png",
  "Sp_ShockSonar.png",
  "Sp_Skewer.png",
  "Sp_TripleTornado.png",
]

const LANG_DATA = {
  Shakespiral: "アラマキ砦",
  Shakedent: "ムニ・エール海洋発電所",
  Shakeup: "シェケナダム",
  Shakeship: "難破船ドン・ブラコ",
  Carousel: "スメーシーワールド",
  Mid: "普通",
  High: "満潮",
  Low: "干潮",
  weapon: {
    0: "ボールドマーカー",
    10: "わかばシューター",
    20: "シャープマーカー",
    30: "プロモデラーMG",
    40: "スプラシューター",
    50: ".52ガロン",
    60: "N-ZAP85",
    70: "プライムシューター",
    80: ".96ガロン",
    90: "ジェットスイーパー",
    100: "スペースシューター",
    200: "ノヴァブラスター",
    210: "ホットブラスター",
    220: "ロングブラスター",
    230: "クラッシュブラスター",
    240: "ラピッドブラスター",
    250: "Rブラスターエリート",
    300: "L3リールガン",
    310: "H3リールガン",
    400: "ボトルガイザー",
    1000: "カーボンローラー",
    1010: "スプラローラー",
    1020: "ダイナモローラー",
    1030: "ヴァリアブルローラー",
    1040: "ワイドローラー",
    1100: "パブロ",
    1110: "ホクサイ",
    2000: "スクイックリンα",
    2010: "スプラチャージャー",
    2030: "リッター4K",
    2050: "14式竹筒銃・甲",
    2060: "ソイチューバー",
    2070: "R-PEN/5H",
    3000: "バケットスロッシャー",
    3010: "ヒッセン",
    3020: "スクリュースロッシャー",
    3030: "オーバーフロッシャー",
    3040: "エクスプロッシャー",
    4000: "スプラスピナー",
    4010: "バレルスピナー",
    4020: "ハイドラント",
    4030: "クーゲルシュライバー",
    4040: "ノーチラス47",
    5000: "スパッタリー",
    5010: "スプラマニューバー",
    5020: "ケルビン525",
    5030: "デュアルスイーパー",
    5040: "クアッドホッパーブラック",
    6000: "パラシェルター",
    6010: "キャンピングシェルター",
    6020: "スパイガジェット",
    7010: "トライストリンガー",
    7020: "LACT-450",
    8000: "ジムワイパー",
    8010: "ドライブワイパー",
    9000: "クマサン印のストリンガー",
    9010: "クマサン印のブラスター",
    9020: "クマサン印のシェルター",
    9030: "クマサン印のワイパー",
    9040: "クマサン印のスロッシャー",
    9050: "クマサン印のチャージャー",
    10000: "？",
  },
}

const STAGE_DATA = {
  Shakespiral: {
    Mid: {
      AnchorPoint: {
        x: 1720,
        y: 1920,
        angle: 45,
        scale: 2.4,
      },
      RocketLinks: [
        "CF",
        "CB",
        "CD",
        "CE",
        "CG",
        "CH",
        "CA",
        "AF",
        "FB",
        "BD",
        "DE",
        "EG",
        "GH",
        "HA",
      ],
    },
    High: {
      AnchorPoint: {
        x: 2140,
        y: 2220,
        angle: 45,
        scale: 3.2,
      },
      RocketLinks: ["DC", "DB", "CB", "BA", "CA"],
    },
    Low: {
      AnchorPoint: {
        x: 1150,
        y: 1400,
        angle: 51.5,
        scale: 2.3,
      },
      RocketLinks: [
        "EA",
        "AC",
        "CB",
        "BA",
        "AD",
        "DE",
        "DB",
        "BM",
        "MF",
        "FB",
        "FD",
        "DL",
        "LF",
        "MK",
        "FK",
        "FH",
        "HK",
        "LN",
        "LH",
        "NH",
        "NJ",
        "JH",
        "HG",
        "KG",
        "JI",
        "IG",
        "HI",
      ],
    },
  },
  Shakedent: {
    Mid: {
      AnchorPoint: {
        x: 1920,
        y: 1760,
        angle: 0,
        scale: 2.4,
      },
      RocketLinks: [
        "AB",
        "BC",
        "CA",
        "AD",
        "CD",
        "BK",
        "KC",
        "CE",
        "ED",
        "EF",
        "FK",
        "KI",
        "FI",
        "IJ",
        "FJ",
        "FG",
        "EG",
        "EH",
        "HG",
        "HD",
      ],
    },
    High: {
      AnchorPoint: {
        x: 1920,
        y: 2000,
        angle: 0,
        scale: 3.4,
      },
      RocketLinks: ["DC", "CE", "EA", "AB", "BD", "BE"],
    },
    Low: {
      AnchorPoint: {
        x: 1720,
        y: 760,
        angle: 0,
        scale: 2.6,
      },
      RocketLinks: [
        "ER",
        "RB",
        "BE",
        "RA",
        "AC",
        "CB",
        "BH",
        "HC",
        "EF",
        "FH",
        "FG",
        "HG",
        "CD",
        "GD",
        "GS",
        "SD",
        "GJ",
        "JF",
        "JM",
        "SM",
        "SP",
        "PQ",
        "SQ",
        "QL",
        "JI",
        "IM",
        "IN",
        "MN",
        "NO",
        "OK",
        "KL",
        "KQ",
        "OL",
        "ML",
      ],
    },
  },
  Shakeup: {
    Mid: {
      AnchorPoint: {
        x: 1500,
        y: 800,
        angle: 0,
        scale: 1.9,
      },
      RocketLinks: [
        "CF",
        "CG",
        "CB",
        "GB",
        "GF",
        "CL",
        "CD",
        "CH",
        "BL",
        "LD",
        "DH",
        "DI",
        "HI",
        "BA",
        "AJ",
        "BJ",
        "JL",
        "LK",
        "KJ",
        "JE",
        "EK",
        "AE",
      ],
    },
    High: {
      AnchorPoint: {
        x: 1400,
        y: 1400,
        angle: 0,
        scale: 2.7,
      },
      RocketLinks: ["AB", "AE", "BE", "BC", "EC", "CD", "ED"],
    },
    Low: {
      AnchorPoint: {
        x: 3035,
        y: 2700,
        angle: -123,
        scale: 2.3,
      },
      RocketLinks: [
        "CF",
        "CE",
        "CG",
        "CB",
        "CD",
        "CA",
        "FD",
        "ED",
        "GB",
        "DA",
        "AB",
        "LA",
        "AO",
        "OB",
        "LN",
        "NO",
        "LH",
        "HM",
        "HP",
        "PJ",
        "JM",
        "MK",
        "KI",
        "IM",
        "NM",
        "LM",
      ],
    },
  },
  Shakeship: {
    Mid: {
      AnchorPoint: {
        x: 2720,
        y: 1780,
        angle: -90,
        scale: 2.4,
      },
      RocketLinks: [
        "PM",
        "AS",
        "TS",
        "SM",
        "SF",
        "MD",
        "ME",
        "ED",
        "EI",
        "DI",
        "IV",
        "VC",
        "VO",
        "OC",
        "KD",
        "KN",
        "KO",
        "KJ",
        "DN",
        "OJ",
        "CB",
        "JB",
        "JQ",
        "QN",
        "NF",
        "QF",
        "FG",
        "QG",
        "BL",
        "LG",
        "LH",
        "HU",
        "GR",
        "RF",
      ],
    },
    High: {
      AnchorPoint: {
        x: 2520,
        y: 1920,
        angle: -90,
        scale: 2.6,
      },
      RocketLinks: [
        "DB",
        "DG",
        "GB",
        "GH",
        "HA",
        "AB",
        "HC",
        "AC",
        "CE",
        "AE",
        "EF",
        "CF",
      ],
    },
    Low: {
      AnchorPoint: {
        x: 300,
        y: 1980,
        angle: 90,
        scale: 2.5,
      },
      RocketLinks: [
        "MN",
        "NP",
        "PB",
        "BF",
        "FR",
        "RM",
        "NH",
        "HJ",
        "MA",
        "MD",
        "DS",
        "SH",
        "HO",
        "SL",
        "SE",
        "OI",
        "IE",
        "EL",
        "LD",
        "AG",
        "GK",
        "KL",
        "IQ",
        "IC",
      ],
    },
  },
}

const CANVAS_WIDTH = 3840
const CANVAS_HEIGHT = 3840
const CANVAS_CENTER_X = CANVAS_WIDTH / 2
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2
const PX_PER_METER = CANVAS_WIDTH / 240

const voronoi = new Voronoi()
let current_voronoi_label = ""

function create_spots() {
  rocket_jump_point_map = {}
  const point_wrapper = $("#map_point_wrapper")
  ;[
    "CoopArrivalPointEnemyCupTwins{i}",
    "CoopArrivalPointEnemyTower{i}",
    "CoopEventRelayGoldenIkuraDropPoint{i}",
    "CoopEventRelaySpawnBoxLocator",
    "CoopSakeArtilleryGunPoint{i}",
    "CoopSakeCarrierWaitPos",
    "CoopSpawnBoxLocator",
    "CoopSakePillarArrivalPoint",
    "CoopSakerocketJumpPoint",
    "CoopSpawnPointEnemy{i}",
    "CoopSpawnPointSakeFlyBagMan",
  ].forEach((unit_name) => {
    let tide_tmp = tide
    const is_constable = unit_name.includes("{i}")
    const i_max = is_constable ? 2 : 0
    // タマヒロイの場合は例外処理
    // 現在の潮位 (Mid, High, Low) のデータがひとつも見つからなければ Cmn から取得する
    if (unit_name === "CoopSpawnPointSakeFlyBagMan") {
      let bagman_count = 0
      obj_map[unit_name].forEach((obj) => {
        if (obj["Layer"] === tide_tmp) {
          bagman_count++
        }
      })
      if (bagman_count === 0) {
        tide_tmp = "Cmn"
      }
    }
    for (let i = 0; i <= i_max; i++) {
      const key = is_constable ? unit_name.replace("{i}", i) : unit_name
      const obj_list = obj_map[key]
      let i_obj = 0
      obj_list.forEach((obj) => {
        if (obj["Layer"] !== tide_tmp) {
          return
        }
        const x = F(obj["Translate"]["0"])
        const y = F(obj["Translate"]["2"])
        const xpx = CANVAS_CENTER_X + x * PX_PER_METER
        const ypx = CANVAS_CENTER_Y + y * PX_PER_METER
        const label = String.fromCharCode("A".charCodeAt(0) + i_obj)

        const el_point = create_map_point(
          xpx,
          ypx,
          "map-point",
          unit_name.replace("{i}", ""),
        )
        if (unit_name.includes(unit_name)) {
          el_point.setAttribute("data-dir", i)
        }
        el_point.addEventListener("click", () => {
          console.log(obj)
        })
        point_wrapper.appendChild(el_point)

        // コウモリの駐車場だった場合は例外処理
        if (unit_name === "CoopSakerocketJumpPoint") {
          // クリック時にコンテキストメニューを表示
          el_point.addEventListener("click", () => {
            // Element を作成
            const el_wrapper = create_element_from_html(`
              <div id="modal_context_menu_wrapper">
                <div id="modal_context_menu_container">
                  <div class="modal-context-menu-item" name="search">
                    <div class="modal-context-menu-item-text">索敵半径を表示</div>
                    <div class="modal-context-menu-item-check"></div>
                  </div>
                  <div class="modal-context-menu-item" name="voronoi">
                    <div class="modal-context-menu-item-text">ボロノイ図を表示</div>
                    <div class="modal-context-menu-item-check"></div>
                  </div>
                </div>
              </div>
            `)
            document.body.appendChild(el_wrapper)

            // メニューを表示する座標を計算
            const rect = el_point.getBoundingClientRect()
            const el_container = el_wrapper.querySelector(
              "#modal_context_menu_container",
            )
            el_container.style.setProperty("left", "0")
            el_container.style.setProperty("top", "0")
            const anchor_x = rect.x + rect.width / 2
            const anchor_y = rect.y + rect.height / 2
            let transform_origin_x
            let transform_origin_y
            if (
              anchor_x > fitter.cache.window.width / 2 &&
              anchor_x + el_container.clientWidth > fitter.cache.window.width
            ) {
              el_container.style.setProperty(
                "left",
                `${anchor_x - el_container.clientWidth}px`,
              )
              transform_origin_x = "right"
            } else {
              el_container.style.setProperty("left", `${anchor_x}px`)
              transform_origin_x = "left"
            }
            if (
              anchor_y > fitter.cache.window.height / 2 &&
              anchor_y + el_container.clientHeight > fitter.cache.window.height
            ) {
              el_container.style.setProperty(
                "top",
                `${anchor_y - el_container.clientHeight}px`,
              )
              transform_origin_y = "bottom"
            } else {
              el_container.style.setProperty("top", `${anchor_y}px`)
              transform_origin_y = "top"
            }
            el_container.style.setProperty(
              "transform-origin",
              `${transform_origin_x} ${transform_origin_y}`,
            )

            el_container
              .querySelector("[name=search]")
              .addEventListener("click", () => {
                if (el_point.classList.contains("display-search")) {
                  el_point.classList.remove("display-search")
                } else {
                  el_point.classList.add("display-search")
                }
              })

            el_container
              .querySelector("[name=voronoi]")
              .addEventListener("click", () => {
                draw_voronoi(obj["Label"])
              })

            if (el_point.classList.contains("display-search")) {
              el_container.querySelector(
                "[name=search] .modal-context-menu-item-check",
              ).textContent = "✓"
            }

            if (obj["Label"] === current_voronoi_label) {
              el_container.querySelector(
                "[name=voronoi] .modal-context-menu-item-check",
              ).textContent = "✓"
            }

            // アウターをクリックしたときメニューを消す
            el_wrapper.addEventListener("click", () => {
              el_wrapper.remove()
            })
          })
        }

        // コウモリの駐車場だった場合は例外処理
        if (unit_name === "CoopSakerocketJumpPoint") {
          rocket_jump_point_map[label] = {
            obj,
            x: xpx,
            y: ypx,
          }
          rocket_links.forEach((str) => {
            if (!str.includes(label)) {
              return
            }
            const target = str.replace(label, "")
            if (!obj["LinkLabels"]) {
              obj["LinkLabels"] = []
            }
            obj["LinkLabels"].push(target)
            obj["Label"] = label
          })
          const el_search = create_map_point(
            xpx,
            ypx,
            "map-search",
            unit_name.replace("{i}", ""),
          )
          point_wrapper.appendChild(el_search)
        }

        // ラベル(A, B, C, ...)を表示する
        if (unit_name === "CoopSakerocketJumpPoint") {
          const el_label = create_map_point(
            xpx,
            ypx,
            "map-label",
            unit_name.replace("{i}", ""),
            label,
          )
          el_label.update_transform = function () {
            const scale = 1 / (transformer.stage.scale * transformer.user.scale)
            const angle = -(transformer.stage.angle + transformer.user.angle)
            this.style.setProperty(
              "transform",
              `translate(-50%, 0%) scale(${scale}) rotate(${angle}deg)`,
            )
          }
          el_label.update_transform()
          el_label.setAttribute("data-unit", unit_name.replace("{i}", ""))
          point_wrapper.appendChild(el_label)
          function set_reverse_transform(el) {}
        }
        i_obj++
      })
    }
  })

  //
  // コウモリの接続図
  //

  {
    const canvas = $("#map_canvas_rocket_link")
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    const ctx = canvas.getContext("2d")
    rocket_links.forEach((str) => {
      const pos1 = rocket_jump_point_map[str.charAt(0)]
      const pos2 = rocket_jump_point_map[str.charAt(1)]
      ctx.lineWidth = 6
      ctx.strokeStyle = "#03a9f4"
      ctx.beginPath()
      ctx.moveTo(pos1.x, pos1.y)
      ctx.lineTo(pos2.x, pos2.y)
      ctx.stroke()
    })
  }

  //
  // カタパッドの接続図
  //

  {
    const canvas = $("#map_canvas_cuptwins_link")
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    const ctx = canvas.getContext("2d")

    obj_map["CoopCupTwinsRail"].forEach((obj) => {
      if (obj["Layer"] !== tide) {
        return
      }
      const rail_points = obj["RailPoints"] || obj["Points"]
      ctx.beginPath()
      ctx.strokeStyle = "#f44336"
      ctx.lineWidth = 2
      //ctx.moveTo(x, z);
      const x1 =
        CANVAS_CENTER_X + F(rail_points[0]["Translate"]["0"]) * PX_PER_METER
      const z1 =
        CANVAS_CENTER_Y + F(rail_points[0]["Translate"]["2"]) * PX_PER_METER
      ctx.moveTo(x1, z1)
      const len = rail_points.length
      // const last = obj['UnitConfigName'].includes('Pink') ? len : len + 1;
      const last = len + 1
      if (!("Control0" in rail_points[0])) {
        for (let i = 1; i < last; i++) {
          const i2 = (i - 0) % len
          const p2 = rail_points[i2]
          const x2 = CANVAS_CENTER_X + F(p2["Translate"]["0"]) * PX_PER_METER
          const z2 = CANVAS_CENTER_Y + F(p2["Translate"]["2"]) * PX_PER_METER
          ctx.lineTo(x2, z2)
        }
      } else {
        for (let i = 1; i < last; i++) {
          const i1 = (i - 1) % len
          const i2 = (i - 0) % len
          const p1 = rail_points[i1]
          const p2 = rail_points[i2]
          const c1x = p1["Control1"]
            ? p1["Control1"]["0"]
            : p1["Translate"]["0"]
          const c1z = p1["Control1"]
            ? p1["Control1"]["2"]
            : p1["Translate"]["2"]
          const c2x = p2["Control0"]
            ? p2["Control0"]["0"]
            : p2["Translate"]["0"]
          const c2z = p2["Control0"]
            ? p2["Control0"]["2"]
            : p2["Translate"]["2"]
          const c1 = {
            x: PX_PER_METER * c1x + CANVAS_CENTER_X,
            z: PX_PER_METER * c1z + CANVAS_CENTER_Y,
          }
          const c2 = {
            x: PX_PER_METER * c2x + CANVAS_CENTER_X,
            z: PX_PER_METER * c2z + CANVAS_CENTER_Y,
          }
          const x2 = PX_PER_METER * p2["Translate"]["0"] + CANVAS_CENTER_X
          const z2 = PX_PER_METER * p2["Translate"]["2"] + CANVAS_CENTER_Y
          ctx.bezierCurveTo(c1.x, c1.z, c2.x, c2.z, x2, z2)
        }
      }
      ctx.stroke()
    })
  }
}

/**
 * 画面全体のスケールを更新
 */
function draw_scale_screen() {
  const el_svg_g = $("#svg_scale_screen_g")

  const cx = I(fitter.cache.main.width / 2)
  const cy = I(fitter.cache.main.height / 2)
  const w = fitter.cache.main.width
  const h = fitter.cache.main.height
  const f = Math.max(w, h)

  // 距離単位の変換レートは以下
  // 1本 = 80px = 5m = 50DU
  // 1本  ... 試射場ライン1本分の距離
  // 80px ... ステージ画像素材(3840*3840)のうちの80px分
  // 5m   ... ステージの3DモデルをBlenderで開いたときの5m分
  // 50DU ... DUはスプラ2の検証記事でしばしば使われる距離の単位
  const scale_width = 80
  const scale_width_resized =
    scale_width *
    transformer.canvas.scale *
    transformer.stage.scale *
    transformer.user.scale
  const scale_vertical_num = Math.ceil(cx / scale_width_resized)
  const scale_horizontal_num = Math.ceil(cy / scale_width_resized)
  const scale_diagonal_num = Math.ceil(
    distance(0, 0, cx, cy) / scale_width_resized,
  )
  let html = ""
  if (saver.data.config["input-display-scale"]) {
    if (saver.data.config["select-scale-type"] !== "circle") {
      for (let i = 0; i < 2; i++) {
        const sign = i === 0 ? 1 : -1
        const j_first = i === 0 ? 0 : 1
        for (let j = j_first; j < scale_vertical_num; j++) {
          const x = I(cx + sign * j * scale_width_resized)
          const d = `M ${x} 0 L ${x} ${h}`
          html += `<path d="${d}" />`
        }
      }
      for (let i = 0; i < 2; i++) {
        const sign = i === 0 ? 1 : -1
        const j_first = i === 0 ? 0 : 1
        for (let j = j_first; j < scale_horizontal_num; j++) {
          const y = I(cy + sign * j * scale_width_resized)
          const d = `M 0 ${y} L ${w} ${y}`
          html += `<path d="${d}" />`
        }
      }
    } else {
      for (let i = 1; i < scale_diagonal_num; i++) {
        const r = I(i * scale_width_resized)
        let style = ""
        if (i % 5 === 0) {
          style = "stroke-width: 3px;"
          const m = rem_to_px(0.2)
          html += `<text x="${cx + m}" y="${
            cy - r - m
          }" style="font-size: 1rem" fill="currentColor">${i}</text>`
          html += `<text x="${cx + r + m}" y="${
            cy - m
          }" style="font-size: 1rem" fill="currentColor">${i}</text>`
        }
        html += `<circle cx="${cx}" cy="${cy}" r="${r}" style="${style}" />`
      }
      html += `<line x1="${-f}" y1="${cy}" x2="${f}" y2="${cy}" style="transform: rotate(+45deg); transform-origin: center center;" />`
      html += `<line x1="${-f}" y1="${cy}" x2="${f}" y2="${cy}" style="transform: rotate(-45deg); transform-origin: center center;" />`
      html += `<line x1="${-f}" y1="${cy}" x2="${f}" y2="${cy}" style="transform: rotate(+90deg); transform-origin: center center;" />`
      html += `<line x1="${-f}" y1="${cy}" x2="${f}" y2="${cy}" style="transform: rotate(-00deg); transform-origin: center center;" />`
    }
  }
  el_svg_g.innerHTML = html
}
window.draw_scale_screen = draw_scale_screen

/**
 * 画面左下のスケールを更新
 */
function draw_scale_left_bottom() {
  const el_svg = $("#svg_scale_left_bottom")

  // 80px = 5m = 50DU = 1本
  const scale_width = 80
  const scale_width_resized =
    scale_width *
    transformer.canvas.scale *
    transformer.stage.scale *
    transformer.user.scale
  const scale_num = 5
  const scale_x = 10
  const scale_y = 20
  const scale_h = Math.min(6, parseInt(scale_width_resized / 4))
  const y0 = scale_y + scale_h
  const y1 = scale_y
  let d = ""
  for (let i = 0; i < scale_num; i++) {
    const c = i === 0 ? "M" : "L"
    const x0 = scale_x + scale_width_resized * i
    const x1 = scale_x + scale_width_resized * (i + 1)
    d += `${c} ${x0} ${y0} L ${x0} ${y1} L ${x1} ${y1}`
  }
  d += `L ${scale_x + scale_width_resized * scale_num} ${y0}`
  let html = ""
  html += `<path d="${d}" />`
  el_svg.innerHTML = html
}

function draw() {
  // const canvas_bg = $('#map_canvas_bg');
  // canvas_bg.width = CANVAS_WIDTH;
  // canvas_bg.height = CANVAS_HEIGHT;
  // const ctx_bg = canvas_bg.getContext('2d');
  // ctx_bg.lineWidth = 4;
  // ctx_bg.lineCap = 'butt';
  // ctx_bg.strokeStyle = 'black';
  // ctx_bg.beginPath();
  // ctx_bg.moveTo(100, 100);
  // ctx_bg.lineTo(100, 200);
  // ctx_bg.stroke();
  // const point_wrapper = $("#map_point_wrapper")
  // const canvas = $("#map_canvas_voronoi")
  // canvas.width = CANVAS_WIDTH
  // canvas.height = CANVAS_HEIGHT
  // const ctx = canvas.getContext("2d")
  // obj_map["CoopSakerocketJumpPoint"].forEach((obj) => {
  //   if (obj["Layer"] !== "Low") return
  //   const x = F(obj["Translate"]["0"])
  //   const y = F(obj["Translate"]["2"])
  //   const xpx = CANVAS_CENTER_X + x * PX_PER_METER
  //   const ypx = CANVAS_CENTER_Y + y * PX_PER_METER
  //   const elm = create_map_point(xpx, ypx)
  //   elm.onclick = () => {
  //     console.log(obj["Hash"])
  //     console.log(obj)
  //   }
  //   const link_count = obj["Links"] ? obj["Links"].length : 0
  //   const obj2_list = []
  //   obj_map["CoopSakerocketJumpPoint"].forEach((obj2) => {
  //     if (obj2["Layer"] !== "Low") return
  //     if (obj === obj2) return
  //     const x2 = F(obj2["Translate"]["0"])
  //     const y2 = F(obj2["Translate"]["2"])
  //     const r = Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2))
  //     obj2_list.push({
  //       o: obj2,
  //       r,
  //     })
  //   })
  //   obj2_list.sort((a, b) => {
  //     return a.r > b.r ? 1 : -1
  //   })
  //   const jump_list = []
  //   for (let i = 0; i < link_count; i++) {
  //     jump_list.push(obj2_list[i].o)
  //   }
  //   jump_list.forEach((obj2) => {
  //     const x2 = F(obj2["Translate"]["0"])
  //     const y2 = F(obj2["Translate"]["2"])
  //     const x2px = CANVAS_CENTER_X + x2 * PX_PER_METER
  //     const y2px = CANVAS_CENTER_Y + y2 * PX_PER_METER
  //     ctx.lineWidth = 10
  //     ctx.strokeStyle = "black"
  //     ctx.beginPath()
  //     ctx.moveTo(xpx, ypx)
  //     ctx.lineTo(x2px, y2px)
  //     ctx.stroke()
  //   })
  //   point_wrapper.appendChild(elm)
  // })
  // draw_voronoi();
}

function draw_voronoi(rocket_label = "A") {
  const canvas = $("#map_canvas_voronoi")
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext("2d")

  if (current_voronoi_label === rocket_label) {
    current_voronoi_label = ""
    return
  }

  current_voronoi_label = rocket_label

  const points = []
  const def = rocket_jump_point_map[rocket_label].obj
  def["LinkLabels"].forEach((label) => {
    points.push(rocket_jump_point_map[label])
  })

  if (!points.length) {
    return
  }

  const diagram = voronoi.compute(points, {
    xl: 0,
    xr: CANVAS_WIDTH,
    yt: 0,
    yb: CANVAS_HEIGHT,
  })
  // ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // see http://hackist.jp/?p=306
  ctx.save()
  ctx.globalAlpha = 0.6
  ctx.globalCompositeOperation = "multiply"
  const new_cells = []
  const cellslen = diagram.cells.length
  for (let cell_id = 0; cell_id < cellslen; cell_id++) {
    var new_cell = []
    var cell = diagram.cells[cell_id]
    var halfedgelen = cell.halfedges.length
    for (let halfedge_id = 0; halfedge_id < halfedgelen; halfedge_id++) {
      var p1 = cell.halfedges[halfedge_id].edge.va
      var p2 = cell.halfedges[halfedge_id].edge.vb
      var np1 =
        halfedge_id == 0
          ? cell.halfedges[halfedge_id + 1].edge.va
          : cell.halfedges[halfedge_id - 1].edge.va
      var np2 =
        halfedge_id == 0
          ? cell.halfedges[halfedge_id + 1].edge.vb
          : cell.halfedges[halfedge_id - 1].edge.vb
      var tmp_p =
        halfedge_id == 0
          ? p1 == np1 || p1 == np2
            ? p2
            : p1
          : p1 == np1 || p1 == np2
          ? p1
          : p2
      var new_p = {}
      new_p.x = tmp_p.x
      new_p.y = tmp_p.y
      new_cell.push(new_p)
    }
    new_cells.push(new_cell)
  }
  new_cells.forEach((cell, i) => {
    const COLORS_VORONOI = [
      "rgb(255,75,0)",
      "rgb(255,241,0)",
      "rgb(3,175,122)",
      "rgb(0,90,255)",
      "rgb(77,196,255)",
      "rgb(255,128,130)",
      "rgb(246,170,0)",
      "rgb(153,0,153)",
      "rgb(128,64,0)",
    ]
    const color = COLORS_VORONOI[i % COLORS_VORONOI.length]
    ctx.fillStyle = color
    ctx.beginPath()
    cell.forEach((vertex, i) => {
      ctx[i === 0 ? "moveTo" : "lineTo"](vertex.x, vertex.y)
    })
    ctx.closePath()
    ctx.fill()
  })
  ctx.restore()
  // if (canvasSetting.maptype !== 'floorplan') {
  //     ctx = voronoiCtx;
  //     ctx.strokeStyle = 'white';
  //     ctx.lineWidth = 1.5 / canvasSetting.stageScale;
  //     ctx.shadowBlur = 4;
  //     ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  //     var diagramlen = diagram.edges.length;
  //     for (i = 0; i < diagramlen; i++) {
  //         var p1 = diagram.edges[i].va;
  //         var p2 = diagram.edges[i].vb;
  //         ctx.beginPath();
  //         ctx.moveTo(p1.x, p1.y);
  //         ctx.lineTo(p2.x, p2.y);
  //         ctx.stroke();
  //     }
  //     ctx.shadowBlur = 0;
  //     ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  //     for (i = 0; i < diagramlen; i++) {
  //         var p1 = diagram.edges[i].va;
  //         var p2 = diagram.edges[i].vb;
  //         ctx.beginPath();
  //         ctx.moveTo(p1.x, p1.y);
  //         ctx.lineTo(p2.x, p2.y);
  //         ctx.stroke();
  //     }
  // }
}

function create_map_point(x, y, classname, unitname, content = "") {
  const el = document.createElement("div")
  el.classList.add(classname)
  el.textContent = content
  el.setAttribute("data-unit", unitname)
  el.style.setProperty("left", `${x}px`)
  el.style.setProperty("top", `${y}px`)
  return el
}

function create_element_from_html(html) {
  const tempEl = document.createElement("div")
  tempEl.innerHTML = html
  return tempEl.firstElementChild
}

/**
 * 各キーがいま押されているかどうかを管理する辞書
 * KeyboardEvent.key をキーとする
 * @type {{string: boolean}}
 */
const keyboard_map = {}

/**
 * 各マウスボタンがいま押されているかどうかを管理する辞書
 * MouseEvent.button をキーとする
 * @type {{string: boolean}}
 */
const mousebutton_map = {}

/**
 * いまコントロールキーを押しているかどうかを返す
 * @returns {boolean}
 */
function is_ctrl() {
  return !!(
    keyboard_map["Control"] ||
    keyboard_map["Ctrl"] ||
    keyboard_map["Ctl"] ||
    keyboard_map["Command"] ||
    keyboard_map["⌘"] ||
    keyboard_map["Meta"]
  )
}

/**
 * いまシフトキーを押しているかどうかを返す
 * @returns {boolean}
 */
function is_shift() {
  return !!keyboard_map["Shift"]
}

/**
 * いまオールトキーを押しているかどうかを返す
 * @returns {boolean}
 */
function is_alt() {
  return !!keyboard_map["Alt"]
}

/**
 * ユーザー操作を検出するためのイベントセットを行う
 */
function init_operation() {
  // イベントハンドラを登録する要素
  const el = window

  //
  // マウスボタンの押下状態を検出
  //

  const handler_mousedown = (e) => {
    mousebutton_map[e.button] = e
  }
  const handler_mouseup = (e) => {
    mousebutton_map[e.button] = null
  }
  el.addEventListener(
    "contextmenu",
    (e) => {
      e.preventDefault()
    },
    { passive: false },
  )
  el.addEventListener("mousedown", handler_mousedown)
  el.addEventListener("mouseup", handler_mouseup)
  el.addEventListener("mouseout", handler_mouseup)
  el.addEventListener("mouseleave", handler_mouseup)

  //
  // マウスホイール操作を検出
  //

  el.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault()
      const delta_y = Math.sign(e.deltaY)
      transformer.user.scale += delta_y / 20
      transformer.user.update_css()
      transformer.update_scale()
    },
    { passive: false },
  )

  //
  // キーボードの押下状態を検出
  //

  el.addEventListener("keydown", (e) => {
    keyboard_map[e.key] = true
  })

  el.addEventListener("keyup", (e) => {
    keyboard_map[e.key] = false
  })
}

/**
 * スマホのジェスチャー操作を実装する
 */
function init_gestures() {
  // PointerEvent を格納しておく
  const ev_cache = []

  // イベントハンドラを登録する
  const add = $("#map_event_layer").addEventListener
  add("pointerdown", pointerdown_handler)
  add("pointermove", pointermove_handler)
  add("pointerup", pointerup_handler)
  add("pointercancel", pointerup_handler)
  add("pointerout", pointerup_handler)
  add("pointerleave", pointerup_handler)

  // ポインターダウン（ジェスチャー検出開始）
  function pointerdown_handler(e) {
    if (e.pointerType !== "touch") {
      return
    }

    // キャッシュにこの指のPointerEventを記録する
    ev_cache.push(e)
  }

  // ポインターアップ（ジェスチャー検出終了）
  function pointerup_handler(e) {
    if (e.pointerType !== "touch") {
      return
    }

    // キャッシュからこの指のPointerEventを取り除く
    remove_event(e)

    // タッチ中の指が2本未満の場合はジェスチャーを初期化する
    if (ev_cache.length < 2) {
      pinch.active = false
      pinch.initial_diff = null
      pinch.starting_diff = null
      pinch.prev_diff = null
      pan.active = false
      pan.initial_positions[0].x = null
      pan.initial_positions[0].y = null
      pan.initial_positions[1].x = null
      pan.initial_positions[1].y = null
      pan.prev_positions[0].x = null
      pan.prev_positions[0].y = null
      pan.prev_positions[1].x = null
      pan.prev_positions[1].y = null
      rotation.active = false
      rotation.initial_angle = null
      rotation.prev_angle = null
    }
  }

  function remove_event(e) {
    for (let i = 0; i < ev_cache.length; i++) {
      if (ev_cache[i].pointerId == e.pointerId) {
        ev_cache.splice(i, 1)
        break
      }
    }
  }

  // マップの最低ズーム率
  const TRANSFORM_USER_MIN_SCALE = 0.4

  // ピンチイン・ピンチアウトによるズームを管理する
  const pinch = {
    active: false,
    threshold: 50,
    initial_diff: null,
    starting_diff: null,
    prev_diff: null,
  }

  // パンによるマップ移動を管理する
  const pan = {
    active: false,
    threshold: 0,
    initial_positions: [
      {
        x: null,
        y: null,
      },
      {
        x: null,
        y: null,
      },
    ],
    prev_positions: [
      {
        x: null,
        y: null,
      },
      {
        x: null,
        y: null,
      },
    ],
  }

  // 回転操作を管理する
  const rotation = {
    threshold: 12,
    active: false,
    initial_angle: null,
    prev_angle: null,
  }

  // ポインタームーブ
  function pointermove_handler(e) {
    // タッチイベントでなければキャンセル
    if (e.pointerType !== "touch") {
      return
    }

    // キャッシュに保存してあるイベントを更新
    const index = ev_cache.findIndex(
      (cached_e) => cached_e.pointerId === e.pointerId,
    )
    ev_cache[index] = e

    // 2本の指でタッチしていない場合はキャンセル
    if (ev_cache.length !== 2) {
      return
    }

    //
    // 回転動作
    //

    const cur_polar = to_polar(
      ev_cache[0].pageX - ev_cache[1].pageX,
      ev_cache[0].pageY - ev_cache[1].pageY,
    )
    const cur_angle = cur_polar.theta
    if (rotation.initial_angle === null) {
      rotation.initial_angle = cur_angle
    } else if (!rotation.active) {
      if (Math.abs(cur_angle - rotation.initial_angle) > rotation.threshold) {
        rotation.active = true
      }
    } else {
      let angle_diff = cur_angle - rotation.prev_angle
      if (Math.abs(angle_diff) > 180) {
        angle_diff =
          Math.min(cur_angle, rotation.prev_angle) +
          360 -
          Math.max(cur_angle, rotation.prev_angle)
        angle_diff *= Math.sign(cur_angle - rotation.prev_angle)
      }
      transformer.user.angle += angle_diff
      const rotated = rotate(transformer.user.x, transformer.user.y, angle_diff)
      transformer.user.x = rotated.x
      transformer.user.y = rotated.y
      transformer.user.update_css()
    }
    rotation.prev_angle = cur_angle

    //
    // ピンチイン・ピンチアウトによるズームイン・ズームアウト処理
    //

    // 現在の2本の指の距離を計測
    const cur_diff = distance(
      ev_cache[0].pageX,
      ev_cache[0].pageY,
      ev_cache[1].pageX,
      ev_cache[1].pageY,
    )
    if (pinch.initial_diff === null) {
      pinch.initial_diff = cur_diff
    } else if (!pinch.active) {
      if (Math.abs(pinch.initial_diff - cur_diff) > pinch.threshold) {
        pinch.active = true
      }
    } else {
      const delta_diff = cur_diff - pinch.prev_diff
      const new_scale = transformer.user.scale + delta_diff / 200
      transformer.user.scale = Math.max(TRANSFORM_USER_MIN_SCALE, new_scale)
      transformer.user.update_css()
    }

    pinch.prev_diff = cur_diff

    //
    // パンによるドラッグ処理
    //

    if (pan.initial_positions[0].x === null) {
      pan.initial_positions[0].x = ev_cache[0].pageX
      pan.initial_positions[0].y = ev_cache[0].pageY
      pan.initial_positions[1].x = ev_cache[1].pageX
      pan.initial_positions[1].y = ev_cache[1].pageY
    } else if (!pan.active) {
      const d1 = {
        x: ev_cache[0].pageX - pan.initial_positions[0].x,
        y: ev_cache[0].pageY - pan.initial_positions[0].y,
      }
      const d2 = {
        x: ev_cache[1].pageX - pan.initial_positions[1].x,
        y: ev_cache[1].pageY - pan.initial_positions[1].y,
      }
      const p1 = to_polar(d1.x, d1.y)
      const p2 = to_polar(d2.x, d2.y)
      let angle_diff = Math.abs(p1.theta - p2.theta)
      if (angle_diff > 180) {
        angle_diff =
          Math.min(p1.theta, p2.theta) - Math.max(p1.theta, p2.theta) + 360
      }
      const move_diff = Math.abs(p1.r - p2.r)
      const move = (p1.r + p2.r) / 2
      if (move > pinch.threshold && angle_diff < 20 && move_diff < 20) {
        pan.active = true
      }
    } else {
      const dx1 = ev_cache[0].pageX - pan.prev_positions[0].x
      const dy1 = ev_cache[0].pageY - pan.prev_positions[0].y
      const dx2 = ev_cache[1].pageX - pan.prev_positions[1].x
      const dy2 = ev_cache[1].pageY - pan.prev_positions[1].y
      const dx = (dx1 + dx2) / 2
      const dy = (dy1 + dy2) / 2
      const rotated = rotate(dx, dy, -transformer.user.angle)
      transformer.user.x += rotated.x
      transformer.user.y += rotated.y
      transformer.user.update_css()
    }
    pan.prev_positions[0].x = ev_cache[0].pageX
    pan.prev_positions[0].y = ev_cache[0].pageY
    pan.prev_positions[1].x = ev_cache[1].pageX
    pan.prev_positions[1].y = ev_cache[1].pageY

    transformer.update_scale()
  }
}


const elm_map = {}

function load_xml(filename, callback) {
  const req = new XMLHttpRequest()
  req.onreadystatechange = function () {
    if (req.readyState === 4) {
      if (req.status === 200) {
        const doc = req.responseXML.documentElement
        const elms = doc.querySelectorAll("Root>C1>C0>C1")
        obj_map = {}
        obj_array = []
        layer_names = []
        unit_names = []
        Array.prototype.forEach.call(elms, (elm, i) => {
          const obj = get_data(elm)
          if (
            stage === "Shakeship" &&
            tide === "Low" &&
            obj["Name"] === "CoopSakerocketJumpPoint" &&
            F(obj["Translate"]["0"]) >= -0.25
          ) {
            return
          }
          const layer = obj["Layer"]
          if (!layer_names.includes(layer)) {
            layer_names.push(layer)
          }
          const unit = obj["Gyaml"]
          if (!unit_names.includes(unit)) {
            unit_names.push(unit)
          }
          obj_array.push(obj)
          if (!(unit in obj_map)) {
            obj_map[unit] = []
          }
          obj_map[unit].push(obj)
        })
        layer_names.sort()
        unit_names.sort()
        callback()
      }
    }
  }
  req.open("GET", "/assets/xml/" + filename + ".xml")
  req.send(null)

  function get_data(element) {
    // 返却用のオブジェクト
    const data = {}
    const children = element.children
    Array.prototype.forEach.call(children, (child, i) => {
      // Name="X" の X をデータ格納用のキーにする
      let param_key = child.getAttribute("Name")
      // X が存在しなければ data を配列と見なしてその長さをキーにする
      if (!param_key) {
        param_key = i
        data.length = i + 1
      }

      // String
      let value = child.getAttribute("StringValue")
      if (value) {
        data[param_key] = value
      } else {
        data[param_key] = get_data(child)
      }
    })
    return data
  }
}

function $(query) {
  if (query in elm_map) {
    return elm_map[query]
  }
  let elm
  if (query.charAt(0) === "#") {
    elm = document.querySelector(query)
  } else {
    elm = document.querySelectorAll(query)
    return elm
  }
  elm_map[query] = elm
  return elm
}

function I(str) {
  return parseInt(str)
}

function F(str) {
  return parseFloat(str)
}

function get_queries(url) {
  const url_str = String(url || window.location)
  const query_str = url_str.slice(url_str.indexOf("?") + 1)
  const queries = {}
  if (!query_str) {
    return queries
  }
  query_str.split("&").forEach((query_str) => {
    const query_arr = query_str.split("=")
    queries[query_arr[0]] = query_arr[1]
  })
  return queries
}

function log() {
  const date = new Date()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  const now =
    (hours < 10 ? "0" + hours : hours) +
    ":" +
    (minutes < 10 ? "0" + minutes : minutes) +
    ":" +
    (seconds < 10 ? "0" + seconds : seconds)
  arguments[0] = "[" + now + "] " + arguments[0]
  console.log.apply(console, arguments)
}

log.format_date = (date) => {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  return (
    (hours < 10 ? "0" + hours : hours) +
    ":" +
    (minutes < 10 ? "0" + minutes : minutes) +
    ":" +
    (seconds < 10 ? "0" + seconds : seconds)
  )
}

/**
 * https://qiita.com/TD12734/items/671064e8fce75faea98d
 */
function get_browser() {
  const ua = window.navigator.userAgent.toLowerCase()
  if (
    ua.indexOf("edge") !== -1 ||
    ua.indexOf("edga") !== -1 ||
    ua.indexOf("edgios") !== -1
  ) {
    return "edge"
  } else if (ua.indexOf("opera") !== -1 || ua.indexOf("opr") !== -1) {
    return "opera"
  } else if (ua.indexOf("samsungbrowser") !== -1) {
    return "samsung"
  } else if (ua.indexOf("ucbrowser") !== -1) {
    return "uc"
  } else if (ua.indexOf("chrome") !== -1 || ua.indexOf("crios") !== -1) {
    return "chrome"
  } else if (ua.indexOf("firefox") !== -1 || ua.indexOf("fxios") !== -1) {
    return "firefox"
  } else if (ua.indexOf("safari") !== -1) {
    return "safari"
  } else if (ua.indexOf("msie") !== -1 || ua.indexOf("trident") !== -1) {
    return "ie"
  } else {
    return "unknown"
  }
}

function get_os() {
  const ua = window.navigator.userAgent.toLowerCase()
  if (ua.indexOf("windows nt") !== -1) {
    return "windows"
  } else if (ua.indexOf("android") !== -1) {
    return "android"
  } else if (ua.indexOf("iphone") !== -1 || ua.indexOf("ipad") !== -1) {
    return "ios"
  } else if (ua.indexOf("mac os x") !== -1) {
    return "mac"
  } else {
    return "unknown"
  }
}

function get_bootstrap_breakpoint() {
  const w = window.innerWidth
  if (w < 576) {
    return "xs"
  } else if (w < 768) {
    return "sm"
  } else if (w < 992) {
    return "md"
  } else if (w < 1200) {
    return "lg"
  } else if (w < 1400) {
    return "xl"
  } else {
    return "xxl"
  }
}

function is_local() {
  if (location.hostname === "127.0.0.1") {
    return true
  } else {
    return false
  }
}

const parse_to_offset_xy = (() => {
  window.addEventListener("DOMContentLoaded", () => {
    $("#map_event_layer").addEventListener("click", (e) => {
      if (e.__callback) {
        const x = e.offsetX
        const y = e.offsetY
        e.__callback({ x, y })
      }
    })
  })

  return (_x, _y) => {
    return new Promise((resolve) => {
      const click_event = new MouseEvent("click", {
        clientX: _x,
        clientY: _y,
        bubbles: false,
        cancelable: true,
        view: window,
      })
      click_event.__callback = resolve
      $("#map_event_layer").dispatchEvent(click_event)
    })
  }
})()

/** https://pisuke-code.com/javascript-convert-rem-to-px/ */
function rem_to_px(rem) {
  const size = getComputedStyle(document.documentElement).fontSize
  return rem * parseFloat(size)
}

HTMLElement.prototype.enable_long_tap = function () {
  let timer
  const handler_start = () => {
    timer = setTimeout(() => {
      const ev = new CustomEvent("longtap")
      this.dispatchEvent(ev)
    }, 500)
  }
  const handler_end = () => {
    clearTimeout(timer)
  }
  this.addEventListener("pointerdown", handler_start)
  this.addEventListener("pointerup", handler_end)
  this.addEventListener("pointerleave", handler_end)
  this.addEventListener("pointerout", handler_end)
}

function create_edge_image(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const edge_width = 16
      const image_size = 400
      const canvas_width = image_size + edge_width * 4
      const canvas_height = image_size + edge_width * 4
      const canvas = document.createElement("canvas")
      canvas.width = canvas_width
      canvas.height = canvas_height
      const ctx = canvas.getContext("2d")
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      ctx.shadowColor = "#000"
      ctx.shadowBlur = edge_width
      ctx.drawImage(img, edge_width * 2, edge_width * 2, image_size, image_size)
      let imagedata = ctx.getImageData(0, 0, canvas_width, canvas_height)
      for (let y = 0; y < canvas_height; y++) {
        for (let x = 0; x < canvas_width; x++) {
          const i = (y * canvas_width + x) * 4
          imagedata.data[i + 0] = imagedata.data[i + 0]
          imagedata.data[i + 1] = imagedata.data[i + 1]
          imagedata.data[i + 2] = imagedata.data[i + 2]
          const a = imagedata.data[i + 3]
          imagedata.data[i + 3] = a * a
        }
      }
      ctx.putImageData(imagedata, 0, 0)

      ctx.shadowColor = "#fff"
      ctx.shadowBlur = 16
      ctx.drawImage(canvas, 0, 0)
      imagedata = ctx.getImageData(0, 0, canvas_width, canvas_height)
      for (let y = 0; y < canvas_height; y++) {
        for (let x = 0; x < canvas_width; x++) {
          const i = (y * canvas_width + x) * 4
          const a = imagedata.data[i + 3]
          if (a > 0 && a < 255) {
            imagedata.data[i + 3] = Math.min(255, Math.pow(a, 3))
          }
        }
      }
      ctx.putImageData(imagedata, 0, 0)

      resolve(canvas)
    }
    img.src = src
  })
}

function rotate(x, y, angle) {
  const radians = (Math.PI / 180) * angle
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const nx = cos * x - sin * y
  const ny = sin * x + cos * y
  return { x: nx, y: ny }
}

function distance(x1, y1, x2, y2) {
  var dx = x2 - x1
  var dy = y2 - y1
  return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))
}

function to_polar(x, y) {
  const r = Math.sqrt(x * x + y * y)
  let theta = Math.atan2(y, x)
  theta = (theta * 180) / Math.PI // convert radians to degrees
  if (theta < 0) {
    theta = theta + 360
  }
  return { r, theta }
}

function to_cartesian(r, theta) {
  const radians = (theta * Math.PI) / 180
  const x = r * Math.cos(radians)
  const y = r * Math.sin(radians)
  return { x, y }
}

let stage
let tide
let obj_array
let obj_map
let layer_names
let unit_names
let rocket_jump_point_map
let rocket_links

/**
 * 初期化
 */
window.addEventListener("DOMContentLoaded", () => {
  log("Hello, Salmon Learn NW!")

  saver.load()
  saver.restore_input()

  // URLクエリパラメータからステージと潮位を特定する
  const query_map = get_queries()
  stage = query_map.stage || "Shakeup"
  tide = query_map.tide || "Low"

  // let step = 0
  // location.pathname.split("/").forEach((str) => {
  //   if (step === 0 && str === "map") {
  //     step = 1
  //   } else if (step === 1) {
  //     stage = str.charAt(0).toUpperCase() + str.substring(1)
  //     step = 2
  //   } else if (step === 2) {
  //     tide = str.charAt(0).toUpperCase() + str.substring(1)
  //     step = 3
  //   }
  // })

  // サイトのタイトルを更新する
  const title = `${LANG_DATA[stage]} - ${LANG_DATA[tide]}`
  document.querySelector("header h1").textContent = title
  document.title = `${title} | サーモンラーンNW`

  // ローディングを表示する
  const main = document.getElementById("main")
  const loading = document.getElementById("loading")
  loading.style.setProperty("display", "block")
  main.appendChild(loading)

  // キャンバスを画面にフィットさせる
  fitter.init()

  // XMLファイルをロードする
  load_xml(stage, () => {
    // マップ画像をロードする
    const map_image = $("#map_image_stage")
    let map_image_src
    if (saver.data.config["select-map-type"] !== "model") {
      map_image_src = `/assets/img/map/plain/${stage}_${tide}.svg`
    } else {
      map_image_src = `/assets/img/map/model/${stage}_${tide}.png`
    }
    const el_canvas = $("#map_canvas_voronoi")
    el_canvas.style.setProperty("mask-image", `url(${map_image_src})`)
    el_canvas.style.setProperty("-webkit-mask-image", `url(${map_image_src})`)
    rocket_links = STAGE_DATA[stage][tide]["RocketLinks"]
    map_image.onload = () => {
      fitter.fit()
      loading.remove()
      $("#map_wrapper").style.setProperty("display", "block")
      draw()
      create_spots()
      init_modal()
    }
    map_image.setAttribute("src", map_image_src)
  })

  init_debug_mode()
  init_draggable()
  init_gestures()
  init_operation()
})

function init_debug_mode() {
  if (!is_local()) {
    return
  }

  // キャンバスをクリックしたときにその座標をコンソールに表示する
  $("#map_event_layer").addEventListener("click", (e) => {
    const x = e.offsetX - 1920
    const y = e.offsetY - 1920
    console.log({ x, y })
  })
}

function update_map_type(type = "model") {
  if (!(stage && tide)) {
    return
  }
  const map_image = $("#map_image_stage")
  let map_image_src
  if (type !== "model") {
    map_image_src = `/assets/img/map/plain/${stage}_${tide}.svg`
  } else {
    map_image_src = `/assets/img/map/model/${stage}_${tide}.png`
  }
  const el_canvas = $("#map_canvas_voronoi")
  el_canvas.style.setProperty("mask-image", `url(${map_image_src})`)
  el_canvas.style.setProperty("-webkit-mask-image", `url(${map_image_src})`)
  map_image.onload = null
  map_image.setAttribute("src", map_image_src)
}
window.update_map_type = update_map_type

/**
 * モーダルウィンドウを初期化する
 */
function init_modal() {
  $(".modal-wrapper").forEach((elm) => {
    ;["wheel", "pointerdown", "mousedown", "click"].forEach((event) => {
      elm.addEventListener(event, (e) => {
        e.stopPropagation()
      })
    })
  })

  $("#modal_weapon_icon").addEventListener("click", () => {
    $("#modal_weapon_icon").style.setProperty("display", "none")
  })

  WEAPON_IDS.forEach((id) => {
    const img = document.createElement("img")
    img.setAttribute("data-src", `/assets/img/weapon/${id}.png`)
    img.classList.add("col-auto")
    img.classList.add("img-icon")
    img.classList.add("lazyload")
    img.setAttribute("title", LANG_DATA["weapon"][id])
    img.setAttribute("alt", LANG_DATA["weapon"][id])
    img.style.setProperty("width", "min(5rem, 14vw, 14vh)")
    img.addEventListener("click", () => {
      new DraggableImage({
        src: img.src,
        classname: "map-user-obj-weapon",
      })
    })
    $("#weapon_icon_area_phone").appendChild(img)
  })

  $("#modal_other_icon").addEventListener("click", () => {
    $("#modal_other_icon").style.setProperty("display", "none")
  })

  ICON_FILENAMES.forEach((filename) => {
    const img = document.createElement("img")
    img.setAttribute("data-src", `/assets/img/icon/${filename}`)
    img.classList.add("col-auto")
    img.classList.add("img-icon")
    img.classList.add("lazyload")
    img.style.setProperty("width", "min(5rem, 14.5vw, 14.5vh)")
    img.addEventListener("click", () => {
      let classname = ""
      if (filename.indexOf("Enm_") === 0) {
        classname = "map-user-obj-enemy"
      }
      new DraggableImage({
        src: img.src,
        classname,
      })
    })

    $("#other_icon_area_phone").appendChild(img)
  })

  lazyload()

  $("#modal_config").addEventListener("click", () => {
    $("#modal_config").style.setProperty("display", "none")
  })

  $("#modal_config_content").addEventListener("click", (e) => {
    e.stopPropagation()
  })
}

/**
 * モーダルウィンドウを開く関数
 * HTMLの onclick に書けるようにする
 */
window.open_modal_weapon = () => {
  $("#modal_weapon_icon").style.setProperty("display", "block")
}
window.open_modal_other = () => {
  $("#modal_other_icon").style.setProperty("display", "block")
}
window.open_modal_config = () => {
  $("#modal_config").style.setProperty("display", "block")
}

/**
 * マップのビューを画面にいい感じにフィットさせるためのクラス
 */
const fitter = {
  /**
   * 各種情報を記憶しておくマップ
   */
  cache: {
    window: {
      width: 0,
      height: 0,
    },
    main: {
      width: 0,
      height: 0,
    },
    header: {
      width: 0,
      height: 0,
    },
    footer: {
      width: 0,
      height: 0,
    },
  },

  /**
   * 初期化
   */
  init() {
    this.fit()
    window.addEventListener("resize", () => {
      this.fit()
    })
    window.addEventListener("orientationchange", () => {
      this.fit()
    })
  },

  /**
   * フィットさせる
   * @returns
   */
  fit() {
    // 画面の横幅, 高さ, および両者のうち小さいほうを取得する
    const window_width =
      document.documentElement.clientWidth || window.innerWidth
    const window_height =
      document.documentElement.clientHeight || window.innerHeight
    const window_side_small = Math.min(window_width, window_height)

    // 画面の高さから header, footer の高さを差し引いた残りが
    // キャンバスに利用できる高さである
    const header = $("#header")
    const footer = $("#footer")
    const main_width = window_width
    const main_height =
      window_height - header.clientHeight - footer.clientHeight
    const main_side_small = Math.min(main_width, main_height)
    $("#map_wrapper").style.setProperty("height", `${main_height}px`)
    $("#map_wrapper").style.setProperty(
      "padding-bottom",
      `${footer.clientHeight}px`,
    )

    // キャンバスが画面に収まるようにするための拡大率を計算し設定する
    const scale = main_side_small / CANVAS_WIDTH
    $("#map_canvas_scaler").style.setProperty("transform", `scale(${scale})`)

    // キャンバスに設定する left, top 方向の余白を計算する
    // (画面の縦横比とキャンバスの縦横比が一致していない場合は必ず余白が発生する)
    let ml = 0
    let mt = 0
    if (main_width > main_height) {
      ml = Math.floor((main_width - main_height) / 2)
    } else {
      mt = Math.floor((main_height - main_width) / 2)
    }

    // キャンバスサイズと余白が決定できたので
    // #map_stage_scaler, #dummy_area のスタイルに対して
    // 直接 width, height, margin-left を設定する
    const css_scaler_stage = $("#map_stage_scaler").style
    css_scaler_stage.setProperty("width", `${main_side_small}px`)
    css_scaler_stage.setProperty("height", `${main_side_small}px`)
    css_scaler_stage.setProperty("margin-left", `${ml}px`)
    const css_scaler_user = $("#map_user_scaler").style
    css_scaler_user.setProperty("width", `${main_width}px`)
    css_scaler_user.setProperty("height", `${main_height}px`)
    const css_dummy = $("#dummy_area").style
    css_dummy.setProperty("width", `${main_side_small}px`)
    css_dummy.setProperty("height", `${main_side_small}px`)
    css_dummy.setProperty("margin-left", `${ml}px`)

    if (!stage) {
      return
    }

    const anchor_point = STAGE_DATA[stage][tide]["AnchorPoint"]
    const ax = anchor_point.x * scale
    const ay = anchor_point.y * scale
    css_scaler_stage.setProperty("transform-origin", `${ax}px ${ay}px`)
    css_scaler_stage.setProperty(
      "transform",
      `translateX(${-(ax - CANVAS_CENTER_X * scale)}px) translateY(${
        -ay + 20
      }px) rotate(${anchor_point.angle}deg) scale(${anchor_point.scale})`,
    )

    transformer.stage.angle = anchor_point.angle
    transformer.stage.scale = anchor_point.scale
    transformer.canvas.scale = scale

    // スケール表示用の svg に横幅と高さを設定する
    const el_svg_scale = $("#svg_scale_screen")
    el_svg_scale.setAttribute("width", window_width)
    el_svg_scale.setAttribute("height", main_height)

    // キャッシュを保存
    this.cache.window.width = window_width
    this.cache.window.height = window_height
    this.cache.main.width = window_width
    this.cache.main.height = main_height
    this.cache.header.width = window_width
    this.cache.header.height = header.clientHeight
    this.cache.footer.width = window_width
    this.cache.footer.height = footer.clientHeight

    // ブラウザの拡大率(未使用)
    const zoom =
      window.devicePixelRatio ||
      (window.screen.availWidth / document.documentElement.clientWidth) * 100

    const w = window.innerWidth
    let prefix
    if (w < 576) {
      prefix = "xs"
    } else if (w < 768) {
      prefix = "sm"
    } else if (w < 992) {
      prefix = "md"
    } else if (w < 1200) {
      prefix = "lg"
    } else if (w < 1400) {
      prefix = "xl"
    } else {
      prefix = "xxl"
    }
    document.body.setAttribute("data-screen-size", prefix)

    // キャンバスの変形をアップデート
    transformer.update_scale()
  },
}

/**
 * ローカルストレージへのデータの出し入れを行うクラス
 */
window.saver = {
  key: "salmon-learn-nw-map",
  is_save_enabled: false,
  data: {
    config: {},
  },
  load() {
    const storage_data_str = localStorage.getItem(this.key)
    if (!storage_data_str) {
      log("Not found the data in local storage.")
      return
    }
    log("Found the data in local storage!")
    const storage_data_json = JSON.parse(storage_data_str)
    this.data = Object.assign(this.data, storage_data_json)
  },
  save() {
    if (!this.is_save_enabled) {
      return
    }
    const storage_data_str = JSON.stringify(this.data)
    localStorage.setItem(this.key, storage_data_str)
    log("Data was saved in local storage.")
  },
  restore_input() {
    for (const id in this.data.config) {
      const el = document.getElementById(id)
      switch (el.tagName.toLocaleLowerCase()) {
        case "input":
          switch (el.type) {
            case "checkbox":
              el.checked = this.data.config[id]
              el.dispatchEvent(new Event("change"))
              break
          }
          break
        case "select":
          el.value = this.data.config[id]
          el.dispatchEvent(new Event("change"))
          break
      }
    }
    this.is_save_enabled = true
  },
  remove() {
    localStorage.removeItem(this.key)
  },
}

/**
 * キャンバスの変形を管理するクラス
 */
const transformer = {
  canvas: {
    x: 0,
    y: 0,
    angle: 0,
    scale: 1,
  },
  stage: {
    x: 0,
    y: 0,
    angle: 0,
    scale: 1,
  },
  user: {
    x: 0,
    y: 0,
    angle: 0,
    scale: 1,
    update_css() {
      $("#map_user_scaler").style.setProperty(
        "transform",
        `rotate(${this.angle}deg) scale(${this.scale}) translateX(${this.x}px) translateY(${this.y}px)`,
      )
    },
  },
  update_scale() {
    // ユーザーが配置したオブジェクトの変形に反映
    $(".map-user-obj").forEach((elm) => {
      elm.drag_object.update_transform()
    })

    $(".map-label").forEach((elm) => {
      elm.update_transform()
    })

    // スケール表示を調整
    draw_scale_left_bottom()
    draw_scale_screen()
  },
}


})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9zdGFydC5qcyIsIm1hcC5jbGFzcy5EcmFnZ2FibGVJbWFnZS5qcyIsIm1hcC5jb25zdGFudHMuanMiLCJtYXAuZHJhdy5qcyIsIm1hcC5vcGVyYXRpb24uanMiLCJtYXAudXRpbGl0aWVzLmpzIiwibWFwLnV0aWxpdGllcy5tYXRoLmpzIiwibWFwLmpzIiwiX2VuZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbm1CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaGNBO0FBQ0EiLCJmaWxlIjoibWFwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKCgpID0+IHtcclxuIiwiY29uc3QgZHJhZ2dlciA9IHt9XHJcbmZ1bmN0aW9uIGluaXRfZHJhZ2dhYmxlKCkge1xyXG4gIC8vIOeUu+WDj+OCkuODieODqeODg+OCsOOBp+enu+WLleOBleOBm+OCi1xyXG4gICQoXCIjbWFwX2V2ZW50X2xheWVyXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVybW92ZVwiLCAoZSkgPT4ge1xyXG4gICAgaWYgKGRyYWdnZXIuZHJhZ2dpbmdfb2JqKSB7XHJcbiAgICAgIGNvbnN0IGR4ID0gZS5vZmZzZXRYIC0gZHJhZ2dlci5zdGFydF94XHJcbiAgICAgIGNvbnN0IGR5ID0gZS5vZmZzZXRZIC0gZHJhZ2dlci5zdGFydF95XHJcbiAgICAgIGNvbnN0IG5ld194ID0gZHJhZ2dlci5kcmFnZ2luZ19vYmpfc3RhcnRfeCArIGR4XHJcbiAgICAgIGNvbnN0IG5ld195ID0gZHJhZ2dlci5kcmFnZ2luZ19vYmpfc3RhcnRfeSArIGR5XHJcbiAgICAgIGRyYWdnZXIuZHJhZ2dpbmdfb2JqLnNldF94eShuZXdfeCwgbmV3X3kpXHJcbiAgICAgIHJldHVyblxyXG4gICAgfVxyXG4gICAgaWYgKCEhbW91c2VidXR0b25fbWFwW1wiMVwiXSkge1xyXG4gICAgICBjb25zdCByb3RhdGVkID0gcm90YXRlKGUubW92ZW1lbnRYLCBlLm1vdmVtZW50WSwgLXRyYW5zZm9ybWVyLnVzZXIuYW5nbGUpXHJcbiAgICAgIHRyYW5zZm9ybWVyLnVzZXIueCArPSByb3RhdGVkLnhcclxuICAgICAgdHJhbnNmb3JtZXIudXNlci55ICs9IHJvdGF0ZWQueVxyXG4gICAgICB0cmFuc2Zvcm1lci51c2VyLnVwZGF0ZV9jc3MoKVxyXG4gICAgICB0cmFuc2Zvcm1lci51cGRhdGVfc2NhbGUoKVxyXG4gICAgICByZXR1cm5cclxuICAgIH1cclxuICAgIGlmICghIW1vdXNlYnV0dG9uX21hcFtcIjJcIl0pIHtcclxuICAgICAgY29uc3QgY3ggPSBmaXR0ZXIuY2FjaGUubWFpbi53aWR0aCAvIDJcclxuICAgICAgY29uc3QgY3kgPSBmaXR0ZXIuY2FjaGUuaGVhZGVyLmhlaWdodCArIGZpdHRlci5jYWNoZS5tYWluLmhlaWdodCAvIDJcclxuICAgICAgY29uc3QgY3VyX3BvbGFyID0gdG9fcG9sYXIoZS5zY3JlZW5YIC0gY3gsIGUuc2NyZWVuWSAtIGN5KVxyXG4gICAgICBjb25zdCBjdXJfYW5nbGUgPSBjdXJfcG9sYXIudGhldGFcclxuICAgICAgY29uc3QgZiA9IG1vdXNlYnV0dG9uX21hcFtcIjJcIl1cclxuICAgICAgY29uc3QgY3VyX3BvbGFyX3N0YXJ0ID0gdG9fcG9sYXIoZi5zY3JlZW5YIC0gY3gsIGYuc2NyZWVuWSAtIGN5KVxyXG4gICAgICBjb25zdCBjdXJfYW5nbGVfc3RhcnQgPSBjdXJfcG9sYXJfc3RhcnQudGhldGFcclxuICAgICAgY29uc3QgZGVsdGFfYW5nbGUgPSBjdXJfYW5nbGUgLSBjdXJfYW5nbGVfc3RhcnRcclxuICAgICAgdHJhbnNmb3JtZXIudXNlci5hbmdsZSArPSBkZWx0YV9hbmdsZVxyXG4gICAgICB0cmFuc2Zvcm1lci51c2VyLnVwZGF0ZV9jc3MoKVxyXG4gICAgICBtb3VzZWJ1dHRvbl9tYXBbXCIyXCJdID0gZVxyXG4gICAgICB0cmFuc2Zvcm1lci51cGRhdGVfc2NhbGUoKVxyXG4gICAgfVxyXG4gIH0pXHJcblxyXG4gIC8vIOeUu+WDj+OBruODieODqeODg+OCsOOCkue1guS6huOBmeOCi1xyXG4gICQoXCIjbWFwX2V2ZW50X2xheWVyXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVydXBcIiwgYXN5bmMgKGUpID0+IHtcclxuICAgIGRyYWdnZXIuZHJhZ2dpbmdfb2JqID0gbnVsbFxyXG4gICAgJChcIiNtYXBfd3JhcHBlclwiKS5jbGFzc0xpc3QucmVtb3ZlKFwiZHJhZ2dpbmdcIilcclxuICB9KVxyXG59XHJcblxyXG5jbGFzcyBEcmFnZ2FibGVJbWFnZSB7XHJcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xyXG4gICAgdGhpcy54ID0gMFxyXG4gICAgdGhpcy55ID0gMFxyXG4gICAgdGhpcy5zY2FsZSA9IDFcclxuICAgIHRoaXMuYW5nbGUgPSAwXHJcbiAgICB0aGlzLnNoYWRvd19jb2xvciA9IFwicmdiYSgwLCAwLCAwLCAwLjMpXCJcclxuICAgIHRoaXMuc2hhZG93X2FuZ2xlID0gNDVcclxuICAgIHRoaXMuc2hhZG93X3NpemUgPSAxNlxyXG4gICAgdGhpcy5zaGFkb3dfYmx1ciA9IDEwXHJcbiAgICB0aGlzLmluaXRfeHkob3B0aW9ucy54LCBvcHRpb25zLnksIGFzeW5jIChwb3MpID0+IHtcclxuICAgICAgdGhpcy54ID0gcG9zLnhcclxuICAgICAgdGhpcy55ID0gcG9zLnlcclxuICAgICAgLy8gY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIilcclxuICAgICAgLy8gZWxlbWVudC5zcmMgPSBvcHRpb25zLnNyY1xyXG4gICAgICBjb25zdCBlbGVtZW50ID0gYXdhaXQgY3JlYXRlX2VkZ2VfaW1hZ2Uob3B0aW9ucy5zcmMpXHJcbiAgICAgIGlmIChvcHRpb25zLnRpdGxlKSB7XHJcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLCBvcHRpb25zLnRpdGxlKVxyXG4gICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKFwiYWx0XCIsIG9wdGlvbnMudGl0bGUpXHJcbiAgICAgIH1cclxuICAgICAgZWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eShcImxlZnRcIiwgYCR7cG9zLnh9cHhgKVxyXG4gICAgICBlbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KFwidG9wXCIsIGAke3Bvcy55fXB4YClcclxuICAgICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKFwibWFwLXVzZXItb2JqXCIpXHJcbiAgICAgIGlmIChvcHRpb25zLmNsYXNzbmFtZSkge1xyXG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZChvcHRpb25zLmNsYXNzbmFtZSlcclxuICAgICAgfVxyXG4gICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCBhc3luYyAoZSkgPT4ge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICAgIGRyYWdnZXIuZHJhZ2dpbmdfb2JqID0gdGhpc1xyXG4gICAgICAgIGRyYWdnZXIuZHJhZ2dpbmdfb2JqX3N0YXJ0X3ggPSB0aGlzLnhcclxuICAgICAgICBkcmFnZ2VyLmRyYWdnaW5nX29ial9zdGFydF95ID0gdGhpcy55XHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gYXdhaXQgcGFyc2VfdG9fb2Zmc2V0X3h5KGUuY2xpZW50WCwgZS5jbGllbnRZKVxyXG4gICAgICAgIGRyYWdnZXIuc3RhcnRfeCA9IG9mZnNldC54XHJcbiAgICAgICAgZHJhZ2dlci5zdGFydF95ID0gb2Zmc2V0LnlcclxuICAgICAgICAkKFwiI21hcF93cmFwcGVyXCIpLmNsYXNzTGlzdC5hZGQoXCJkcmFnZ2luZ1wiKVxyXG4gICAgICB9KVxyXG4gICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVybW92ZVwiLCBhc3luYyAoZSkgPT4ge1xyXG4gICAgICAgIGlmIChkcmFnZ2VyLmRyYWdnaW5nX29iaikge1xyXG4gICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gYXdhaXQgcGFyc2VfdG9fb2Zmc2V0X3h5KGUuY2xpZW50WCwgZS5jbGllbnRZKVxyXG4gICAgICAgICAgY29uc3QgZHggPSBvZmZzZXQueCAtIGRyYWdnZXIuc3RhcnRfeFxyXG4gICAgICAgICAgY29uc3QgZHkgPSBvZmZzZXQueSAtIGRyYWdnZXIuc3RhcnRfeVxyXG4gICAgICAgICAgY29uc3QgbmV3X3ggPSBkcmFnZ2VyLmRyYWdnaW5nX29ial9zdGFydF94ICsgZHhcclxuICAgICAgICAgIGNvbnN0IG5ld195ID0gZHJhZ2dlci5kcmFnZ2luZ19vYmpfc3RhcnRfeSArIGR5XHJcbiAgICAgICAgICBkcmFnZ2VyLmRyYWdnaW5nX29iai5zZXRfeHkobmV3X3gsIG5ld195KVxyXG4gICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcnVwXCIsIGFzeW5jIChlKSA9PiB7XHJcbiAgICAgICAgaWYgKGRyYWdnZXIuZHJhZ2dpbmdfb2JqKSB7XHJcbiAgICAgICAgICBkcmFnZ2VyLmRyYWdnaW5nX29iaiA9IG51bGxcclxuICAgICAgICAgICQoXCIjbWFwX3dyYXBwZXJcIikuY2xhc3NMaXN0LnJlbW92ZShcImRyYWdnaW5nXCIpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50XHJcbiAgICAgIHRoaXMuZWxlbWVudC5kcmFnX29iamVjdCA9IHRoaXNcclxuICAgICAgdGhpcy51cGRhdGVfdHJhbnNmb3JtKClcclxuICAgICAgJChcIiNtYXBfdXNlcl9vYmpfd3JhcHBlclwiKS5hcHBlbmRDaGlsZChlbGVtZW50KVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIGluaXRfeHkoeCwgeSwgY2FsbGJhY2spIHtcclxuICAgIGlmICh4ICE9PSB1bmRlZmluZWQgJiYgeSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIGNhbGxiYWNrKHsgeCwgeSB9KVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcGFyc2VfdG9fb2Zmc2V0X3h5KHdpbmRvdy5pbm5lcldpZHRoIC8gMiwgd2luZG93LmlubmVySGVpZ2h0IC8gMikudGhlbihcclxuICAgICAgICAocG9zKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCB4ID0gcG9zLnggLSAxOTIwXHJcbiAgICAgICAgICBjb25zdCB5ID0gcG9zLnkgLSAxOTIwXHJcbiAgICAgICAgICBjYWxsYmFjayh7IHgsIHkgfSlcclxuICAgICAgICB9LFxyXG4gICAgICApXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzZXRfeHkoeCwgeSkge1xyXG4gICAgdGhpcy54ID0geFxyXG4gICAgdGhpcy55ID0geVxyXG4gICAgdGhpcy5lbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KFwibGVmdFwiLCBgJHt4fXB4YClcclxuICAgIHRoaXMuZWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eShcInRvcFwiLCBgJHt5fXB4YClcclxuICB9XHJcblxyXG4gIGdldF94eSh4LCB5KSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiB0aGlzLngsXHJcbiAgICAgIHk6IHRoaXMueSxcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHVwZGF0ZV90cmFuc2Zvcm0oKSB7XHJcbiAgICBjb25zdCBzY2FsZSA9XHJcbiAgICAgICgxLjUgKiB0aGlzLnNjYWxlKSAvICh0cmFuc2Zvcm1lci5zdGFnZS5zY2FsZSAqIHRyYW5zZm9ybWVyLnVzZXIuc2NhbGUpXHJcbiAgICBjb25zdCBhbmdsZSA9XHJcbiAgICAgIHRoaXMuYW5nbGUgLSAodHJhbnNmb3JtZXIuc3RhZ2UuYW5nbGUgKyB0cmFuc2Zvcm1lci51c2VyLmFuZ2xlKVxyXG4gICAgdGhpcy5lbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KFxyXG4gICAgICBcInRyYW5zZm9ybVwiLFxyXG4gICAgICBgdHJhbnNsYXRlKC01MCUsIC01MCUpIHNjYWxlKCR7c2NhbGV9KSByb3RhdGUoJHthbmdsZX1kZWcpYCxcclxuICAgIClcclxuXHJcbiAgICBjb25zdCBzYSA9IHRoaXMuc2hhZG93X2FuZ2xlXHJcbiAgICBjb25zdCBzYiA9IHRoaXMuc2hhZG93X2JsdXJcclxuICAgIGNvbnN0IHN4eSA9IHJvdGF0ZSh0aGlzLnNoYWRvd19zaXplLCAwLCBzYSlcclxuICAgIGNvbnN0IHN4ID0gc3h5LnhcclxuICAgIGNvbnN0IHN5ID0gc3h5LnlcclxuICAgIHRoaXMuZWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eShcclxuICAgICAgXCJmaWx0ZXJcIixcclxuICAgICAgYGRyb3Atc2hhZG93KCR7c3h9cHggJHtzeX1weCAke3NifXB4ICR7dGhpcy5zaGFkb3dfY29sb3J9KWAsXHJcbiAgICApXHJcbiAgfVxyXG5cclxuICBib3JkZXJpbmcoKSB7XHJcbiAgICBjb25zdCBuID0gNFxyXG4gICAgY29uc3QgciA9IDAuMlxyXG4gICAgY29uc3QgY3NzX2xpc3QgPSBbXVxyXG4gICAgY29uc3QgY3NzX2xpc3RfMiA9IFtdXHJcbiAgICBjb25zdCB1bmkgPSBcInJlbVwiXHJcbiAgICBjb25zdCBjb2wgPSBcImJsYWNrXCJcclxuICAgIGNvbnN0IGNvbF8yID0gXCJ3aGl0ZVwiXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xyXG4gICAgICBjb25zdCBhbmdsZSA9IChpICogMTgwKSAvIG5cclxuICAgICAgY29uc3QgeyB4LCB5IH0gPSByb3RhdGUociwgMCwgYW5nbGUpXHJcbiAgICAgIGNzc19saXN0LnB1c2goYGRyb3Atc2hhZG93KCR7eH0ke3VuaX0gJHt5fSR7dW5pfSAwICR7Y29sfSlgKVxyXG4gICAgICBjc3NfbGlzdC5wdXNoKGBkcm9wLXNoYWRvdygkey14fSR7dW5pfSAkey15fSR7dW5pfSAwICR7Y29sfSlgKVxyXG4gICAgICBjc3NfbGlzdF8yLnB1c2goYGRyb3Atc2hhZG93KCR7eH0ke3VuaX0gJHt5fSR7dW5pfSAwICR7Y29sXzJ9KWApXHJcbiAgICAgIGNzc19saXN0XzIucHVzaChgZHJvcC1zaGFkb3coJHsteH0ke3VuaX0gJHsteX0ke3VuaX0gMCAke2NvbF8yfSlgKVxyXG4gICAgfVxyXG4gICAgdGhpcy5lbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KFxyXG4gICAgICBcImZpbHRlclwiLFxyXG4gICAgICBjc3NfbGlzdC5qb2luKFwiIFwiKSArIFwiIFwiICsgY3NzX2xpc3RfMi5qb2luKFwiIFwiKSxcclxuICAgIClcclxuICB9XHJcbn1cclxuIiwiY29uc3QgU1RBR0VfTkFNRVMgPSBbXHJcbiAgXCJTaGFrZXNwaXJhbFwiLFxyXG4gIFwiU2hha2VkZW50XCIsXHJcbiAgXCJTaGFrZXVwXCIsXHJcbiAgXCJTaGFrZXNoaXBcIixcclxuICBcIkNhcm91c2VsXCIsXHJcbl1cclxuXHJcbmNvbnN0IFdFQVBPTl9JRFMgPSBbXHJcbiAgMCwgMTAsIDIwLCAzMCwgNDAsIDUwLCA2MCwgNzAsIDgwLCA5MCwgMTAwLCAyMDAsIDIxMCwgMjIwLCAyMzAsIDI0MCwgMjUwLCAzMDAsXHJcbiAgMzEwLCA0MDAsIDEwMDAsIDEwMTAsIDEwMjAsIDEwMzAsIDEwNDAsIDExMDAsIDExMTAsIDIwMDAsIDIwMTAsIDIwMzAsIDIwNTAsXHJcbiAgMjA2MCwgMjA3MCwgMzAwMCwgMzAxMCwgMzAyMCwgMzAzMCwgMzA0MCwgNDAwMCwgNDAxMCwgNDAyMCwgNDAzMCwgNDA0MCwgNTAwMCxcclxuICA1MDEwLCA1MDIwLCA1MDMwLCA1MDQwLCA2MDAwLCA2MDEwLCA2MDIwLCA3MDEwLCA3MDIwLCA4MDAwLCA4MDEwLCA5MDAwLCA5MDEwLFxyXG4gIDkwMjAsIDkwMzAsIDkwNDAsIDkwNTAsIDEwMDAwLFxyXG5dXHJcblxyXG5jb25zdCBJQ09OX0ZJTEVOQU1FUyA9IFtcclxuICBcIkVubV9TbWFsbGZyeV9pY29uLnBuZ1wiLFxyXG4gIFwiRW5tX0NodW1faWNvbi5wbmdcIixcclxuICBcIkVubV9DaHVtX1J1c2hfaWNvbi5wbmdcIixcclxuICBcIkVubV9Db2hvY2tfaWNvbi5wbmdcIixcclxuICBcIkVubV9Db2hvenVuYV9pY29uLnBuZ1wiLFxyXG4gIFwiRW5tX0NoaW5vb2tfaWNvbi5wbmdcIixcclxuICBcIkVubV9TbmF0Y2hlcl9pY29uLnBuZ1wiLFxyXG4gIFwiRW5tX1N0ZWVsaGVhZF9pY29uLnBuZ1wiLFxyXG4gIFwiRW5tX0ZseWZpc2hfaWNvbi5wbmdcIixcclxuICBcIkVubV9TY3JhcHBlcl9pY29uLnBuZ1wiLFxyXG4gIFwiRW5tX1N0ZWVsX0VlbF9pY29uLnBuZ1wiLFxyXG4gIFwiRW5tX1N0aW5nZXJfaWNvbi5wbmdcIixcclxuICBcIkVubV9NYXdzX2ljb24ucG5nXCIsXHJcbiAgXCJFbm1fRHJpenpsZXJfaWNvbi5wbmdcIixcclxuICBcIkVubV9GaXNoX1N0aWNrX2ljb24ucG5nXCIsXHJcbiAgXCJFbm1fRmxpcHBlci1GbG9wcGVyX2ljb24ucG5nXCIsXHJcbiAgXCJFbm1fQmlnX1Nob3RfaWNvbi5wbmdcIixcclxuICBcIkVubV9CaWdfU2hvdF9HdW5faWNvbi5wbmdcIixcclxuICBcIkVubV9TbGFtbWluJ19MaWRfaWNvbi5wbmdcIixcclxuICBcIkVubV9Hb2xkaWVfaWNvbi5wbmdcIixcclxuICBcIkVubV9HcmlsbGVyX2ljb24ucG5nXCIsXHJcbiAgXCJFbm1fTXVkbW91dGhfaWNvbi5wbmdcIixcclxuICBcIkVubV9NdWRtb3V0aF9Hb2xkZW5faWNvbi5wbmdcIixcclxuICBcIkVubV9Ub3JuYWRvX0JveF9pY29uLnBuZ1wiLFxyXG4gIFwiTGFiZWxfQS5zdmdcIixcclxuICBcIkxhYmVsX0Iuc3ZnXCIsXHJcbiAgXCJMYWJlbF9DLnN2Z1wiLFxyXG4gIFwiTGFiZWxfMS5zdmdcIixcclxuICBcIkxhYmVsXzIuc3ZnXCIsXHJcbiAgXCJMYWJlbF8zLnN2Z1wiLFxyXG4gIFwiR29sZGVuX0VnZ18xLnBuZ1wiLFxyXG4gIFwiR29sZGVuX0VnZ18yLnBuZ1wiLFxyXG4gIFwiR29sZGVuX0VnZ18zLnBuZ1wiLFxyXG4gIFwiR29sZGVuX0VnZ180LnBuZ1wiLFxyXG4gIFwiR29sZGVuX0VnZ181LnBuZ1wiLFxyXG4gIFwiR29sZGVuX0VnZ182LnBuZ1wiLFxyXG4gIFwiR29sZGVuX0VnZ183LnBuZ1wiLFxyXG4gIFwiR29sZGVuX0VnZ184LnBuZ1wiLFxyXG4gIFwiR29sZGVuX0VnZ185LnBuZ1wiLFxyXG4gIFwiR29sZGVuX0VnZ18xMC5wbmdcIixcclxuICBcIlBsYXllcl9TcXVpZF8xLnBuZ1wiLFxyXG4gIFwiUGxheWVyX1NxdWlkXzIucG5nXCIsXHJcbiAgXCJQbGF5ZXJfU3F1aWRfMy5wbmdcIixcclxuICBcIlBsYXllcl9TcXVpZF80LnBuZ1wiLFxyXG4gIFwiUGxheWVyX1NxdWlkXzUucG5nXCIsXHJcbiAgXCJQbGF5ZXJfU3F1aWRfNi5wbmdcIixcclxuICBcIlBsYXllcl9TcXVpZF83LnBuZ1wiLFxyXG4gIFwiUGxheWVyX09jdG9fMS5wbmdcIixcclxuICBcIlBsYXllcl9PY3RvXzIucG5nXCIsXHJcbiAgXCJQbGF5ZXJfT2N0b18zLnBuZ1wiLFxyXG4gIFwiUGxheWVyX09jdG9fNC5wbmdcIixcclxuICBcIlBsYXllcl9PY3RvXzUucG5nXCIsXHJcbiAgXCJQbGF5ZXJfT2N0b182LnBuZ1wiLFxyXG4gIFwiUGxheWVyX09jdG9fNy5wbmdcIixcclxuICBcIlNwX0NoYXJpb3QucG5nXCIsXHJcbiAgXCJTcF9KZXRwYWNrLnBuZ1wiLFxyXG4gIFwiU3BfTWljcm9MYXNlci5wbmdcIixcclxuICBcIlNwX05pY2VCYWxsLnBuZ1wiLFxyXG4gIFwiU3BfU2hvY2tTb25hci5wbmdcIixcclxuICBcIlNwX1NrZXdlci5wbmdcIixcclxuICBcIlNwX1RyaXBsZVRvcm5hZG8ucG5nXCIsXHJcbl1cclxuXHJcbmNvbnN0IExBTkdfREFUQSA9IHtcclxuICBTaGFrZXNwaXJhbDogXCLjgqLjg6njg57jgq3noKZcIixcclxuICBTaGFrZWRlbnQ6IFwi44Og44OL44O744Ko44O844Or5rW35rSL55m66Zu75omAXCIsXHJcbiAgU2hha2V1cDogXCLjgrfjgqfjgrHjg4rjg4Djg6BcIixcclxuICBTaGFrZXNoaXA6IFwi6Zuj56C06Ii544OJ44Oz44O744OW44Op44KzXCIsXHJcbiAgQ2Fyb3VzZWw6IFwi44K544Oh44O844K344O844Ov44O844Or44OJXCIsXHJcbiAgTWlkOiBcIuaZrumAmlwiLFxyXG4gIEhpZ2g6IFwi5rqA5r2uXCIsXHJcbiAgTG93OiBcIuW5sua9rlwiLFxyXG4gIHdlYXBvbjoge1xyXG4gICAgMDogXCLjg5zjg7zjg6vjg4njg57jg7zjgqvjg7xcIixcclxuICAgIDEwOiBcIuOCj+OBi+OBsOOCt+ODpeODvOOCv+ODvFwiLFxyXG4gICAgMjA6IFwi44K344Oj44O844OX44Oe44O844Kr44O8XCIsXHJcbiAgICAzMDogXCLjg5fjg63jg6Ljg4fjg6njg7xNR1wiLFxyXG4gICAgNDA6IFwi44K544OX44Op44K344Ol44O844K/44O8XCIsXHJcbiAgICA1MDogXCIuNTLjgqzjg63jg7NcIixcclxuICAgIDYwOiBcIk4tWkFQODVcIixcclxuICAgIDcwOiBcIuODl+ODqeOCpOODoOOCt+ODpeODvOOCv+ODvFwiLFxyXG4gICAgODA6IFwiLjk244Ks44Ot44OzXCIsXHJcbiAgICA5MDogXCLjgrjjgqfjg4Pjg4jjgrnjgqTjg7zjg5Hjg7xcIixcclxuICAgIDEwMDogXCLjgrnjg5rjg7zjgrnjgrfjg6Xjg7zjgr/jg7xcIixcclxuICAgIDIwMDogXCLjg47jg7TjgqHjg5bjg6njgrnjgr/jg7xcIixcclxuICAgIDIxMDogXCLjg5vjg4Pjg4jjg5bjg6njgrnjgr/jg7xcIixcclxuICAgIDIyMDogXCLjg63jg7PjgrDjg5bjg6njgrnjgr/jg7xcIixcclxuICAgIDIzMDogXCLjgq/jg6njg4Pjgrfjg6Xjg5bjg6njgrnjgr/jg7xcIixcclxuICAgIDI0MDogXCLjg6njg5Tjg4Pjg4njg5bjg6njgrnjgr/jg7xcIixcclxuICAgIDI1MDogXCJS44OW44Op44K544K/44O844Ko44Oq44O844OIXCIsXHJcbiAgICAzMDA6IFwiTDPjg6rjg7zjg6vjgqzjg7NcIixcclxuICAgIDMxMDogXCJIM+ODquODvOODq+OCrOODs1wiLFxyXG4gICAgNDAwOiBcIuODnOODiOODq+OCrOOCpOOCtuODvFwiLFxyXG4gICAgMTAwMDogXCLjgqvjg7zjg5zjg7Pjg63jg7zjg6njg7xcIixcclxuICAgIDEwMTA6IFwi44K544OX44Op44Ot44O844Op44O8XCIsXHJcbiAgICAxMDIwOiBcIuODgOOCpOODiuODouODreODvOODqeODvFwiLFxyXG4gICAgMTAzMDogXCLjg7TjgqHjg6rjgqLjg5bjg6vjg63jg7zjg6njg7xcIixcclxuICAgIDEwNDA6IFwi44Ov44Kk44OJ44Ot44O844Op44O8XCIsXHJcbiAgICAxMTAwOiBcIuODkeODluODrVwiLFxyXG4gICAgMTExMDogXCLjg5vjgq/jgrXjgqRcIixcclxuICAgIDIwMDA6IFwi44K544Kv44Kk44OD44Kv44Oq44OzzrFcIixcclxuICAgIDIwMTA6IFwi44K544OX44Op44OB44Oj44O844K444Oj44O8XCIsXHJcbiAgICAyMDMwOiBcIuODquODg+OCv+ODvDRLXCIsXHJcbiAgICAyMDUwOiBcIjE05byP56u5562S6YqD44O755SyXCIsXHJcbiAgICAyMDYwOiBcIuOCveOCpOODgeODpeODvOODkOODvFwiLFxyXG4gICAgMjA3MDogXCJSLVBFTi81SFwiLFxyXG4gICAgMzAwMDogXCLjg5DjgrHjg4Pjg4jjgrnjg63jg4Pjgrfjg6Pjg7xcIixcclxuICAgIDMwMTA6IFwi44OS44OD44K744OzXCIsXHJcbiAgICAzMDIwOiBcIuOCueOCr+ODquODpeODvOOCueODreODg+OCt+ODo+ODvFwiLFxyXG4gICAgMzAzMDogXCLjgqrjg7zjg5Djg7zjg5Xjg63jg4Pjgrfjg6Pjg7xcIixcclxuICAgIDMwNDA6IFwi44Ko44Kv44K544OX44Ot44OD44K344Oj44O8XCIsXHJcbiAgICA0MDAwOiBcIuOCueODl+ODqeOCueODlOODiuODvFwiLFxyXG4gICAgNDAxMDogXCLjg5Djg6zjg6vjgrnjg5Tjg4rjg7xcIixcclxuICAgIDQwMjA6IFwi44OP44Kk44OJ44Op44Oz44OIXCIsXHJcbiAgICA0MDMwOiBcIuOCr+ODvOOCsuODq+OCt+ODpeODqeOCpOODkOODvFwiLFxyXG4gICAgNDA0MDogXCLjg47jg7zjg4Hjg6njgrk0N1wiLFxyXG4gICAgNTAwMDogXCLjgrnjg5Hjg4Pjgr/jg6rjg7xcIixcclxuICAgIDUwMTA6IFwi44K544OX44Op44Oe44OL44Ol44O844OQ44O8XCIsXHJcbiAgICA1MDIwOiBcIuOCseODq+ODk+ODszUyNVwiLFxyXG4gICAgNTAzMDogXCLjg4fjg6XjgqLjg6vjgrnjgqTjg7zjg5Hjg7xcIixcclxuICAgIDUwNDA6IFwi44Kv44Ki44OD44OJ44Ob44OD44OR44O844OW44Op44OD44KvXCIsXHJcbiAgICA2MDAwOiBcIuODkeODqeOCt+OCp+ODq+OCv+ODvFwiLFxyXG4gICAgNjAxMDogXCLjgq3jg6Pjg7Pjg5Tjg7PjgrDjgrfjgqfjg6vjgr/jg7xcIixcclxuICAgIDYwMjA6IFwi44K544OR44Kk44Ks44K444Kn44OD44OIXCIsXHJcbiAgICA3MDEwOiBcIuODiOODqeOCpOOCueODiOODquODs+OCrOODvFwiLFxyXG4gICAgNzAyMDogXCJMQUNULTQ1MFwiLFxyXG4gICAgODAwMDogXCLjgrjjg6Djg6/jgqTjg5Hjg7xcIixcclxuICAgIDgwMTA6IFwi44OJ44Op44Kk44OW44Ov44Kk44OR44O8XCIsXHJcbiAgICA5MDAwOiBcIuOCr+ODnuOCteODs+WNsOOBruOCueODiOODquODs+OCrOODvFwiLFxyXG4gICAgOTAxMDogXCLjgq/jg57jgrXjg7PljbDjga7jg5bjg6njgrnjgr/jg7xcIixcclxuICAgIDkwMjA6IFwi44Kv44Oe44K144Oz5Y2w44Gu44K344Kn44Or44K/44O8XCIsXHJcbiAgICA5MDMwOiBcIuOCr+ODnuOCteODs+WNsOOBruODr+OCpOODkeODvFwiLFxyXG4gICAgOTA0MDogXCLjgq/jg57jgrXjg7PljbDjga7jgrnjg63jg4Pjgrfjg6Pjg7xcIixcclxuICAgIDkwNTA6IFwi44Kv44Oe44K144Oz5Y2w44Gu44OB44Oj44O844K444Oj44O8XCIsXHJcbiAgICAxMDAwMDogXCLvvJ9cIixcclxuICB9LFxyXG59XHJcblxyXG5jb25zdCBTVEFHRV9EQVRBID0ge1xyXG4gIFNoYWtlc3BpcmFsOiB7XHJcbiAgICBNaWQ6IHtcclxuICAgICAgQW5jaG9yUG9pbnQ6IHtcclxuICAgICAgICB4OiAxNzIwLFxyXG4gICAgICAgIHk6IDE5MjAsXHJcbiAgICAgICAgYW5nbGU6IDQ1LFxyXG4gICAgICAgIHNjYWxlOiAyLjQsXHJcbiAgICAgIH0sXHJcbiAgICAgIFJvY2tldExpbmtzOiBbXHJcbiAgICAgICAgXCJDRlwiLFxyXG4gICAgICAgIFwiQ0JcIixcclxuICAgICAgICBcIkNEXCIsXHJcbiAgICAgICAgXCJDRVwiLFxyXG4gICAgICAgIFwiQ0dcIixcclxuICAgICAgICBcIkNIXCIsXHJcbiAgICAgICAgXCJDQVwiLFxyXG4gICAgICAgIFwiQUZcIixcclxuICAgICAgICBcIkZCXCIsXHJcbiAgICAgICAgXCJCRFwiLFxyXG4gICAgICAgIFwiREVcIixcclxuICAgICAgICBcIkVHXCIsXHJcbiAgICAgICAgXCJHSFwiLFxyXG4gICAgICAgIFwiSEFcIixcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgICBIaWdoOiB7XHJcbiAgICAgIEFuY2hvclBvaW50OiB7XHJcbiAgICAgICAgeDogMjE0MCxcclxuICAgICAgICB5OiAyMjIwLFxyXG4gICAgICAgIGFuZ2xlOiA0NSxcclxuICAgICAgICBzY2FsZTogMy4yLFxyXG4gICAgICB9LFxyXG4gICAgICBSb2NrZXRMaW5rczogW1wiRENcIiwgXCJEQlwiLCBcIkNCXCIsIFwiQkFcIiwgXCJDQVwiXSxcclxuICAgIH0sXHJcbiAgICBMb3c6IHtcclxuICAgICAgQW5jaG9yUG9pbnQ6IHtcclxuICAgICAgICB4OiAxMTUwLFxyXG4gICAgICAgIHk6IDE0MDAsXHJcbiAgICAgICAgYW5nbGU6IDUxLjUsXHJcbiAgICAgICAgc2NhbGU6IDIuMyxcclxuICAgICAgfSxcclxuICAgICAgUm9ja2V0TGlua3M6IFtcclxuICAgICAgICBcIkVBXCIsXHJcbiAgICAgICAgXCJBQ1wiLFxyXG4gICAgICAgIFwiQ0JcIixcclxuICAgICAgICBcIkJBXCIsXHJcbiAgICAgICAgXCJBRFwiLFxyXG4gICAgICAgIFwiREVcIixcclxuICAgICAgICBcIkRCXCIsXHJcbiAgICAgICAgXCJCTVwiLFxyXG4gICAgICAgIFwiTUZcIixcclxuICAgICAgICBcIkZCXCIsXHJcbiAgICAgICAgXCJGRFwiLFxyXG4gICAgICAgIFwiRExcIixcclxuICAgICAgICBcIkxGXCIsXHJcbiAgICAgICAgXCJNS1wiLFxyXG4gICAgICAgIFwiRktcIixcclxuICAgICAgICBcIkZIXCIsXHJcbiAgICAgICAgXCJIS1wiLFxyXG4gICAgICAgIFwiTE5cIixcclxuICAgICAgICBcIkxIXCIsXHJcbiAgICAgICAgXCJOSFwiLFxyXG4gICAgICAgIFwiTkpcIixcclxuICAgICAgICBcIkpIXCIsXHJcbiAgICAgICAgXCJIR1wiLFxyXG4gICAgICAgIFwiS0dcIixcclxuICAgICAgICBcIkpJXCIsXHJcbiAgICAgICAgXCJJR1wiLFxyXG4gICAgICAgIFwiSElcIixcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBTaGFrZWRlbnQ6IHtcclxuICAgIE1pZDoge1xyXG4gICAgICBBbmNob3JQb2ludDoge1xyXG4gICAgICAgIHg6IDE5MjAsXHJcbiAgICAgICAgeTogMTc2MCxcclxuICAgICAgICBhbmdsZTogMCxcclxuICAgICAgICBzY2FsZTogMi40LFxyXG4gICAgICB9LFxyXG4gICAgICBSb2NrZXRMaW5rczogW1xyXG4gICAgICAgIFwiQUJcIixcclxuICAgICAgICBcIkJDXCIsXHJcbiAgICAgICAgXCJDQVwiLFxyXG4gICAgICAgIFwiQURcIixcclxuICAgICAgICBcIkNEXCIsXHJcbiAgICAgICAgXCJCS1wiLFxyXG4gICAgICAgIFwiS0NcIixcclxuICAgICAgICBcIkNFXCIsXHJcbiAgICAgICAgXCJFRFwiLFxyXG4gICAgICAgIFwiRUZcIixcclxuICAgICAgICBcIkZLXCIsXHJcbiAgICAgICAgXCJLSVwiLFxyXG4gICAgICAgIFwiRklcIixcclxuICAgICAgICBcIklKXCIsXHJcbiAgICAgICAgXCJGSlwiLFxyXG4gICAgICAgIFwiRkdcIixcclxuICAgICAgICBcIkVHXCIsXHJcbiAgICAgICAgXCJFSFwiLFxyXG4gICAgICAgIFwiSEdcIixcclxuICAgICAgICBcIkhEXCIsXHJcbiAgICAgIF0sXHJcbiAgICB9LFxyXG4gICAgSGlnaDoge1xyXG4gICAgICBBbmNob3JQb2ludDoge1xyXG4gICAgICAgIHg6IDE5MjAsXHJcbiAgICAgICAgeTogMjAwMCxcclxuICAgICAgICBhbmdsZTogMCxcclxuICAgICAgICBzY2FsZTogMy40LFxyXG4gICAgICB9LFxyXG4gICAgICBSb2NrZXRMaW5rczogW1wiRENcIiwgXCJDRVwiLCBcIkVBXCIsIFwiQUJcIiwgXCJCRFwiLCBcIkJFXCJdLFxyXG4gICAgfSxcclxuICAgIExvdzoge1xyXG4gICAgICBBbmNob3JQb2ludDoge1xyXG4gICAgICAgIHg6IDE3MjAsXHJcbiAgICAgICAgeTogNzYwLFxyXG4gICAgICAgIGFuZ2xlOiAwLFxyXG4gICAgICAgIHNjYWxlOiAyLjYsXHJcbiAgICAgIH0sXHJcbiAgICAgIFJvY2tldExpbmtzOiBbXHJcbiAgICAgICAgXCJFUlwiLFxyXG4gICAgICAgIFwiUkJcIixcclxuICAgICAgICBcIkJFXCIsXHJcbiAgICAgICAgXCJSQVwiLFxyXG4gICAgICAgIFwiQUNcIixcclxuICAgICAgICBcIkNCXCIsXHJcbiAgICAgICAgXCJCSFwiLFxyXG4gICAgICAgIFwiSENcIixcclxuICAgICAgICBcIkVGXCIsXHJcbiAgICAgICAgXCJGSFwiLFxyXG4gICAgICAgIFwiRkdcIixcclxuICAgICAgICBcIkhHXCIsXHJcbiAgICAgICAgXCJDRFwiLFxyXG4gICAgICAgIFwiR0RcIixcclxuICAgICAgICBcIkdTXCIsXHJcbiAgICAgICAgXCJTRFwiLFxyXG4gICAgICAgIFwiR0pcIixcclxuICAgICAgICBcIkpGXCIsXHJcbiAgICAgICAgXCJKTVwiLFxyXG4gICAgICAgIFwiU01cIixcclxuICAgICAgICBcIlNQXCIsXHJcbiAgICAgICAgXCJQUVwiLFxyXG4gICAgICAgIFwiU1FcIixcclxuICAgICAgICBcIlFMXCIsXHJcbiAgICAgICAgXCJKSVwiLFxyXG4gICAgICAgIFwiSU1cIixcclxuICAgICAgICBcIklOXCIsXHJcbiAgICAgICAgXCJNTlwiLFxyXG4gICAgICAgIFwiTk9cIixcclxuICAgICAgICBcIk9LXCIsXHJcbiAgICAgICAgXCJLTFwiLFxyXG4gICAgICAgIFwiS1FcIixcclxuICAgICAgICBcIk9MXCIsXHJcbiAgICAgICAgXCJNTFwiLFxyXG4gICAgICBdLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIFNoYWtldXA6IHtcclxuICAgIE1pZDoge1xyXG4gICAgICBBbmNob3JQb2ludDoge1xyXG4gICAgICAgIHg6IDE1MDAsXHJcbiAgICAgICAgeTogODAwLFxyXG4gICAgICAgIGFuZ2xlOiAwLFxyXG4gICAgICAgIHNjYWxlOiAxLjksXHJcbiAgICAgIH0sXHJcbiAgICAgIFJvY2tldExpbmtzOiBbXHJcbiAgICAgICAgXCJDRlwiLFxyXG4gICAgICAgIFwiQ0dcIixcclxuICAgICAgICBcIkNCXCIsXHJcbiAgICAgICAgXCJHQlwiLFxyXG4gICAgICAgIFwiR0ZcIixcclxuICAgICAgICBcIkNMXCIsXHJcbiAgICAgICAgXCJDRFwiLFxyXG4gICAgICAgIFwiQ0hcIixcclxuICAgICAgICBcIkJMXCIsXHJcbiAgICAgICAgXCJMRFwiLFxyXG4gICAgICAgIFwiREhcIixcclxuICAgICAgICBcIkRJXCIsXHJcbiAgICAgICAgXCJISVwiLFxyXG4gICAgICAgIFwiQkFcIixcclxuICAgICAgICBcIkFKXCIsXHJcbiAgICAgICAgXCJCSlwiLFxyXG4gICAgICAgIFwiSkxcIixcclxuICAgICAgICBcIkxLXCIsXHJcbiAgICAgICAgXCJLSlwiLFxyXG4gICAgICAgIFwiSkVcIixcclxuICAgICAgICBcIkVLXCIsXHJcbiAgICAgICAgXCJBRVwiLFxyXG4gICAgICBdLFxyXG4gICAgfSxcclxuICAgIEhpZ2g6IHtcclxuICAgICAgQW5jaG9yUG9pbnQ6IHtcclxuICAgICAgICB4OiAxNDAwLFxyXG4gICAgICAgIHk6IDE0MDAsXHJcbiAgICAgICAgYW5nbGU6IDAsXHJcbiAgICAgICAgc2NhbGU6IDIuNyxcclxuICAgICAgfSxcclxuICAgICAgUm9ja2V0TGlua3M6IFtcIkFCXCIsIFwiQUVcIiwgXCJCRVwiLCBcIkJDXCIsIFwiRUNcIiwgXCJDRFwiLCBcIkVEXCJdLFxyXG4gICAgfSxcclxuICAgIExvdzoge1xyXG4gICAgICBBbmNob3JQb2ludDoge1xyXG4gICAgICAgIHg6IDMwMzUsXHJcbiAgICAgICAgeTogMjcwMCxcclxuICAgICAgICBhbmdsZTogLTEyMyxcclxuICAgICAgICBzY2FsZTogMi4zLFxyXG4gICAgICB9LFxyXG4gICAgICBSb2NrZXRMaW5rczogW1xyXG4gICAgICAgIFwiQ0ZcIixcclxuICAgICAgICBcIkNFXCIsXHJcbiAgICAgICAgXCJDR1wiLFxyXG4gICAgICAgIFwiQ0JcIixcclxuICAgICAgICBcIkNEXCIsXHJcbiAgICAgICAgXCJDQVwiLFxyXG4gICAgICAgIFwiRkRcIixcclxuICAgICAgICBcIkVEXCIsXHJcbiAgICAgICAgXCJHQlwiLFxyXG4gICAgICAgIFwiREFcIixcclxuICAgICAgICBcIkFCXCIsXHJcbiAgICAgICAgXCJMQVwiLFxyXG4gICAgICAgIFwiQU9cIixcclxuICAgICAgICBcIk9CXCIsXHJcbiAgICAgICAgXCJMTlwiLFxyXG4gICAgICAgIFwiTk9cIixcclxuICAgICAgICBcIkxIXCIsXHJcbiAgICAgICAgXCJITVwiLFxyXG4gICAgICAgIFwiSFBcIixcclxuICAgICAgICBcIlBKXCIsXHJcbiAgICAgICAgXCJKTVwiLFxyXG4gICAgICAgIFwiTUtcIixcclxuICAgICAgICBcIktJXCIsXHJcbiAgICAgICAgXCJJTVwiLFxyXG4gICAgICAgIFwiTk1cIixcclxuICAgICAgICBcIkxNXCIsXHJcbiAgICAgIF0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgU2hha2VzaGlwOiB7XHJcbiAgICBNaWQ6IHtcclxuICAgICAgQW5jaG9yUG9pbnQ6IHtcclxuICAgICAgICB4OiAyNzIwLFxyXG4gICAgICAgIHk6IDE3ODAsXHJcbiAgICAgICAgYW5nbGU6IC05MCxcclxuICAgICAgICBzY2FsZTogMi40LFxyXG4gICAgICB9LFxyXG4gICAgICBSb2NrZXRMaW5rczogW1xyXG4gICAgICAgIFwiUE1cIixcclxuICAgICAgICBcIkFTXCIsXHJcbiAgICAgICAgXCJUU1wiLFxyXG4gICAgICAgIFwiU01cIixcclxuICAgICAgICBcIlNGXCIsXHJcbiAgICAgICAgXCJNRFwiLFxyXG4gICAgICAgIFwiTUVcIixcclxuICAgICAgICBcIkVEXCIsXHJcbiAgICAgICAgXCJFSVwiLFxyXG4gICAgICAgIFwiRElcIixcclxuICAgICAgICBcIklWXCIsXHJcbiAgICAgICAgXCJWQ1wiLFxyXG4gICAgICAgIFwiVk9cIixcclxuICAgICAgICBcIk9DXCIsXHJcbiAgICAgICAgXCJLRFwiLFxyXG4gICAgICAgIFwiS05cIixcclxuICAgICAgICBcIktPXCIsXHJcbiAgICAgICAgXCJLSlwiLFxyXG4gICAgICAgIFwiRE5cIixcclxuICAgICAgICBcIk9KXCIsXHJcbiAgICAgICAgXCJDQlwiLFxyXG4gICAgICAgIFwiSkJcIixcclxuICAgICAgICBcIkpRXCIsXHJcbiAgICAgICAgXCJRTlwiLFxyXG4gICAgICAgIFwiTkZcIixcclxuICAgICAgICBcIlFGXCIsXHJcbiAgICAgICAgXCJGR1wiLFxyXG4gICAgICAgIFwiUUdcIixcclxuICAgICAgICBcIkJMXCIsXHJcbiAgICAgICAgXCJMR1wiLFxyXG4gICAgICAgIFwiTEhcIixcclxuICAgICAgICBcIkhVXCIsXHJcbiAgICAgICAgXCJHUlwiLFxyXG4gICAgICAgIFwiUkZcIixcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgICBIaWdoOiB7XHJcbiAgICAgIEFuY2hvclBvaW50OiB7XHJcbiAgICAgICAgeDogMjUyMCxcclxuICAgICAgICB5OiAxOTIwLFxyXG4gICAgICAgIGFuZ2xlOiAtOTAsXHJcbiAgICAgICAgc2NhbGU6IDIuNixcclxuICAgICAgfSxcclxuICAgICAgUm9ja2V0TGlua3M6IFtcclxuICAgICAgICBcIkRCXCIsXHJcbiAgICAgICAgXCJER1wiLFxyXG4gICAgICAgIFwiR0JcIixcclxuICAgICAgICBcIkdIXCIsXHJcbiAgICAgICAgXCJIQVwiLFxyXG4gICAgICAgIFwiQUJcIixcclxuICAgICAgICBcIkhDXCIsXHJcbiAgICAgICAgXCJBQ1wiLFxyXG4gICAgICAgIFwiQ0VcIixcclxuICAgICAgICBcIkFFXCIsXHJcbiAgICAgICAgXCJFRlwiLFxyXG4gICAgICAgIFwiQ0ZcIixcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgICBMb3c6IHtcclxuICAgICAgQW5jaG9yUG9pbnQ6IHtcclxuICAgICAgICB4OiAzMDAsXHJcbiAgICAgICAgeTogMTk4MCxcclxuICAgICAgICBhbmdsZTogOTAsXHJcbiAgICAgICAgc2NhbGU6IDIuNSxcclxuICAgICAgfSxcclxuICAgICAgUm9ja2V0TGlua3M6IFtcclxuICAgICAgICBcIk1OXCIsXHJcbiAgICAgICAgXCJOUFwiLFxyXG4gICAgICAgIFwiUEJcIixcclxuICAgICAgICBcIkJGXCIsXHJcbiAgICAgICAgXCJGUlwiLFxyXG4gICAgICAgIFwiUk1cIixcclxuICAgICAgICBcIk5IXCIsXHJcbiAgICAgICAgXCJISlwiLFxyXG4gICAgICAgIFwiTUFcIixcclxuICAgICAgICBcIk1EXCIsXHJcbiAgICAgICAgXCJEU1wiLFxyXG4gICAgICAgIFwiU0hcIixcclxuICAgICAgICBcIkhPXCIsXHJcbiAgICAgICAgXCJTTFwiLFxyXG4gICAgICAgIFwiU0VcIixcclxuICAgICAgICBcIk9JXCIsXHJcbiAgICAgICAgXCJJRVwiLFxyXG4gICAgICAgIFwiRUxcIixcclxuICAgICAgICBcIkxEXCIsXHJcbiAgICAgICAgXCJBR1wiLFxyXG4gICAgICAgIFwiR0tcIixcclxuICAgICAgICBcIktMXCIsXHJcbiAgICAgICAgXCJJUVwiLFxyXG4gICAgICAgIFwiSUNcIixcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgfSxcclxufVxyXG5cclxuY29uc3QgQ0FOVkFTX1dJRFRIID0gMzg0MFxyXG5jb25zdCBDQU5WQVNfSEVJR0hUID0gMzg0MFxyXG5jb25zdCBDQU5WQVNfQ0VOVEVSX1ggPSBDQU5WQVNfV0lEVEggLyAyXHJcbmNvbnN0IENBTlZBU19DRU5URVJfWSA9IENBTlZBU19IRUlHSFQgLyAyXHJcbmNvbnN0IFBYX1BFUl9NRVRFUiA9IENBTlZBU19XSURUSCAvIDI0MFxyXG4iLCJjb25zdCB2b3Jvbm9pID0gbmV3IFZvcm9ub2koKVxyXG5sZXQgY3VycmVudF92b3Jvbm9pX2xhYmVsID0gXCJcIlxyXG5cclxuZnVuY3Rpb24gY3JlYXRlX3Nwb3RzKCkge1xyXG4gIHJvY2tldF9qdW1wX3BvaW50X21hcCA9IHt9XHJcbiAgY29uc3QgcG9pbnRfd3JhcHBlciA9ICQoXCIjbWFwX3BvaW50X3dyYXBwZXJcIilcclxuICA7W1xyXG4gICAgXCJDb29wQXJyaXZhbFBvaW50RW5lbXlDdXBUd2luc3tpfVwiLFxyXG4gICAgXCJDb29wQXJyaXZhbFBvaW50RW5lbXlUb3dlcntpfVwiLFxyXG4gICAgXCJDb29wRXZlbnRSZWxheUdvbGRlbklrdXJhRHJvcFBvaW50e2l9XCIsXHJcbiAgICBcIkNvb3BFdmVudFJlbGF5U3Bhd25Cb3hMb2NhdG9yXCIsXHJcbiAgICBcIkNvb3BTYWtlQXJ0aWxsZXJ5R3VuUG9pbnR7aX1cIixcclxuICAgIFwiQ29vcFNha2VDYXJyaWVyV2FpdFBvc1wiLFxyXG4gICAgXCJDb29wU3Bhd25Cb3hMb2NhdG9yXCIsXHJcbiAgICBcIkNvb3BTYWtlUGlsbGFyQXJyaXZhbFBvaW50XCIsXHJcbiAgICBcIkNvb3BTYWtlcm9ja2V0SnVtcFBvaW50XCIsXHJcbiAgICBcIkNvb3BTcGF3blBvaW50RW5lbXl7aX1cIixcclxuICAgIFwiQ29vcFNwYXduUG9pbnRTYWtlRmx5QmFnTWFuXCIsXHJcbiAgXS5mb3JFYWNoKCh1bml0X25hbWUpID0+IHtcclxuICAgIGxldCB0aWRlX3RtcCA9IHRpZGVcclxuICAgIGNvbnN0IGlzX2NvbnN0YWJsZSA9IHVuaXRfbmFtZS5pbmNsdWRlcyhcIntpfVwiKVxyXG4gICAgY29uc3QgaV9tYXggPSBpc19jb25zdGFibGUgPyAyIDogMFxyXG4gICAgLy8g44K/44Oe44OS44Ot44Kk44Gu5aC05ZCI44Gv5L6L5aSW5Yem55CGXHJcbiAgICAvLyDnj77lnKjjga7mva7kvY0gKE1pZCwgSGlnaCwgTG93KSDjga7jg4fjg7zjgr/jgYzjgbLjgajjgaTjgoLopovjgaTjgYvjgonjgarjgZHjgozjgbAgQ21uIOOBi+OCieWPluW+l+OBmeOCi1xyXG4gICAgaWYgKHVuaXRfbmFtZSA9PT0gXCJDb29wU3Bhd25Qb2ludFNha2VGbHlCYWdNYW5cIikge1xyXG4gICAgICBsZXQgYmFnbWFuX2NvdW50ID0gMFxyXG4gICAgICBvYmpfbWFwW3VuaXRfbmFtZV0uZm9yRWFjaCgob2JqKSA9PiB7XHJcbiAgICAgICAgaWYgKG9ialtcIkxheWVyXCJdID09PSB0aWRlX3RtcCkge1xyXG4gICAgICAgICAgYmFnbWFuX2NvdW50KytcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICAgIGlmIChiYWdtYW5fY291bnQgPT09IDApIHtcclxuICAgICAgICB0aWRlX3RtcCA9IFwiQ21uXCJcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gaV9tYXg7IGkrKykge1xyXG4gICAgICBjb25zdCBrZXkgPSBpc19jb25zdGFibGUgPyB1bml0X25hbWUucmVwbGFjZShcIntpfVwiLCBpKSA6IHVuaXRfbmFtZVxyXG4gICAgICBjb25zdCBvYmpfbGlzdCA9IG9ial9tYXBba2V5XVxyXG4gICAgICBsZXQgaV9vYmogPSAwXHJcbiAgICAgIG9ial9saXN0LmZvckVhY2goKG9iaikgPT4ge1xyXG4gICAgICAgIGlmIChvYmpbXCJMYXllclwiXSAhPT0gdGlkZV90bXApIHtcclxuICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCB4ID0gRihvYmpbXCJUcmFuc2xhdGVcIl1bXCIwXCJdKVxyXG4gICAgICAgIGNvbnN0IHkgPSBGKG9ialtcIlRyYW5zbGF0ZVwiXVtcIjJcIl0pXHJcbiAgICAgICAgY29uc3QgeHB4ID0gQ0FOVkFTX0NFTlRFUl9YICsgeCAqIFBYX1BFUl9NRVRFUlxyXG4gICAgICAgIGNvbnN0IHlweCA9IENBTlZBU19DRU5URVJfWSArIHkgKiBQWF9QRVJfTUVURVJcclxuICAgICAgICBjb25zdCBsYWJlbCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoXCJBXCIuY2hhckNvZGVBdCgwKSArIGlfb2JqKVxyXG5cclxuICAgICAgICBjb25zdCBlbF9wb2ludCA9IGNyZWF0ZV9tYXBfcG9pbnQoXHJcbiAgICAgICAgICB4cHgsXHJcbiAgICAgICAgICB5cHgsXHJcbiAgICAgICAgICBcIm1hcC1wb2ludFwiLFxyXG4gICAgICAgICAgdW5pdF9uYW1lLnJlcGxhY2UoXCJ7aX1cIiwgXCJcIiksXHJcbiAgICAgICAgKVxyXG4gICAgICAgIGlmICh1bml0X25hbWUuaW5jbHVkZXModW5pdF9uYW1lKSkge1xyXG4gICAgICAgICAgZWxfcG9pbnQuc2V0QXR0cmlidXRlKFwiZGF0YS1kaXJcIiwgaSlcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxfcG9pbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKG9iailcclxuICAgICAgICB9KVxyXG4gICAgICAgIHBvaW50X3dyYXBwZXIuYXBwZW5kQ2hpbGQoZWxfcG9pbnQpXHJcblxyXG4gICAgICAgIC8vIOOCs+OCpuODouODquOBrumnkOi7iuWgtOOBoOOBo+OBn+WgtOWQiOOBr+S+i+WkluWHpueQhlxyXG4gICAgICAgIGlmICh1bml0X25hbWUgPT09IFwiQ29vcFNha2Vyb2NrZXRKdW1wUG9pbnRcIikge1xyXG4gICAgICAgICAgLy8g44Kv44Oq44OD44Kv5pmC44Gr44Kz44Oz44OG44Kt44K544OI44Oh44OL44Ol44O844KS6KGo56S6XHJcbiAgICAgICAgICBlbF9wb2ludC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBFbGVtZW50IOOCkuS9nOaIkFxyXG4gICAgICAgICAgICBjb25zdCBlbF93cmFwcGVyID0gY3JlYXRlX2VsZW1lbnRfZnJvbV9odG1sKGBcclxuICAgICAgICAgICAgICA8ZGl2IGlkPVwibW9kYWxfY29udGV4dF9tZW51X3dyYXBwZXJcIj5cclxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJtb2RhbF9jb250ZXh0X21lbnVfY29udGFpbmVyXCI+XHJcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtb2RhbC1jb250ZXh0LW1lbnUtaXRlbVwiIG5hbWU9XCJzZWFyY2hcIj5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibW9kYWwtY29udGV4dC1tZW51LWl0ZW0tdGV4dFwiPue0ouaVteWNiuW+hOOCkuihqOekujwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtb2RhbC1jb250ZXh0LW1lbnUtaXRlbS1jaGVja1wiPjwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1vZGFsLWNvbnRleHQtbWVudS1pdGVtXCIgbmFtZT1cInZvcm9ub2lcIj5cclxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibW9kYWwtY29udGV4dC1tZW51LWl0ZW0tdGV4dFwiPuODnOODreODjuOCpOWbs+OCkuihqOekujwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtb2RhbC1jb250ZXh0LW1lbnUtaXRlbS1jaGVja1wiPjwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICBgKVxyXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGVsX3dyYXBwZXIpXHJcblxyXG4gICAgICAgICAgICAvLyDjg6Hjg4vjg6Xjg7zjgpLooajnpLrjgZnjgovluqfmqJnjgpLoqIjnrpdcclxuICAgICAgICAgICAgY29uc3QgcmVjdCA9IGVsX3BvaW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXHJcbiAgICAgICAgICAgIGNvbnN0IGVsX2NvbnRhaW5lciA9IGVsX3dyYXBwZXIucXVlcnlTZWxlY3RvcihcclxuICAgICAgICAgICAgICBcIiNtb2RhbF9jb250ZXh0X21lbnVfY29udGFpbmVyXCIsXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICAgZWxfY29udGFpbmVyLnN0eWxlLnNldFByb3BlcnR5KFwibGVmdFwiLCBcIjBcIilcclxuICAgICAgICAgICAgZWxfY29udGFpbmVyLnN0eWxlLnNldFByb3BlcnR5KFwidG9wXCIsIFwiMFwiKVxyXG4gICAgICAgICAgICBjb25zdCBhbmNob3JfeCA9IHJlY3QueCArIHJlY3Qud2lkdGggLyAyXHJcbiAgICAgICAgICAgIGNvbnN0IGFuY2hvcl95ID0gcmVjdC55ICsgcmVjdC5oZWlnaHQgLyAyXHJcbiAgICAgICAgICAgIGxldCB0cmFuc2Zvcm1fb3JpZ2luX3hcclxuICAgICAgICAgICAgbGV0IHRyYW5zZm9ybV9vcmlnaW5feVxyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgYW5jaG9yX3ggPiBmaXR0ZXIuY2FjaGUud2luZG93LndpZHRoIC8gMiAmJlxyXG4gICAgICAgICAgICAgIGFuY2hvcl94ICsgZWxfY29udGFpbmVyLmNsaWVudFdpZHRoID4gZml0dGVyLmNhY2hlLndpbmRvdy53aWR0aFxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICBlbF9jb250YWluZXIuc3R5bGUuc2V0UHJvcGVydHkoXHJcbiAgICAgICAgICAgICAgICBcImxlZnRcIixcclxuICAgICAgICAgICAgICAgIGAke2FuY2hvcl94IC0gZWxfY29udGFpbmVyLmNsaWVudFdpZHRofXB4YCxcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgdHJhbnNmb3JtX29yaWdpbl94ID0gXCJyaWdodFwiXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgZWxfY29udGFpbmVyLnN0eWxlLnNldFByb3BlcnR5KFwibGVmdFwiLCBgJHthbmNob3JfeH1weGApXHJcbiAgICAgICAgICAgICAgdHJhbnNmb3JtX29yaWdpbl94ID0gXCJsZWZ0XCJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgYW5jaG9yX3kgPiBmaXR0ZXIuY2FjaGUud2luZG93LmhlaWdodCAvIDIgJiZcclxuICAgICAgICAgICAgICBhbmNob3JfeSArIGVsX2NvbnRhaW5lci5jbGllbnRIZWlnaHQgPiBmaXR0ZXIuY2FjaGUud2luZG93LmhlaWdodFxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICBlbF9jb250YWluZXIuc3R5bGUuc2V0UHJvcGVydHkoXHJcbiAgICAgICAgICAgICAgICBcInRvcFwiLFxyXG4gICAgICAgICAgICAgICAgYCR7YW5jaG9yX3kgLSBlbF9jb250YWluZXIuY2xpZW50SGVpZ2h0fXB4YCxcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgdHJhbnNmb3JtX29yaWdpbl95ID0gXCJib3R0b21cIlxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGVsX2NvbnRhaW5lci5zdHlsZS5zZXRQcm9wZXJ0eShcInRvcFwiLCBgJHthbmNob3JfeX1weGApXHJcbiAgICAgICAgICAgICAgdHJhbnNmb3JtX29yaWdpbl95ID0gXCJ0b3BcIlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsX2NvbnRhaW5lci5zdHlsZS5zZXRQcm9wZXJ0eShcclxuICAgICAgICAgICAgICBcInRyYW5zZm9ybS1vcmlnaW5cIixcclxuICAgICAgICAgICAgICBgJHt0cmFuc2Zvcm1fb3JpZ2luX3h9ICR7dHJhbnNmb3JtX29yaWdpbl95fWAsXHJcbiAgICAgICAgICAgIClcclxuXHJcbiAgICAgICAgICAgIGVsX2NvbnRhaW5lclxyXG4gICAgICAgICAgICAgIC5xdWVyeVNlbGVjdG9yKFwiW25hbWU9c2VhcmNoXVwiKVxyXG4gICAgICAgICAgICAgIC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsX3BvaW50LmNsYXNzTGlzdC5jb250YWlucyhcImRpc3BsYXktc2VhcmNoXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgIGVsX3BvaW50LmNsYXNzTGlzdC5yZW1vdmUoXCJkaXNwbGF5LXNlYXJjaFwiKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgZWxfcG9pbnQuY2xhc3NMaXN0LmFkZChcImRpc3BsYXktc2VhcmNoXCIpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIGVsX2NvbnRhaW5lclxyXG4gICAgICAgICAgICAgIC5xdWVyeVNlbGVjdG9yKFwiW25hbWU9dm9yb25vaV1cIilcclxuICAgICAgICAgICAgICAuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGRyYXdfdm9yb25vaShvYmpbXCJMYWJlbFwiXSlcclxuICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgaWYgKGVsX3BvaW50LmNsYXNzTGlzdC5jb250YWlucyhcImRpc3BsYXktc2VhcmNoXCIpKSB7XHJcbiAgICAgICAgICAgICAgZWxfY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoXHJcbiAgICAgICAgICAgICAgICBcIltuYW1lPXNlYXJjaF0gLm1vZGFsLWNvbnRleHQtbWVudS1pdGVtLWNoZWNrXCIsXHJcbiAgICAgICAgICAgICAgKS50ZXh0Q29udGVudCA9IFwi4pyTXCJcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG9ialtcIkxhYmVsXCJdID09PSBjdXJyZW50X3Zvcm9ub2lfbGFiZWwpIHtcclxuICAgICAgICAgICAgICBlbF9jb250YWluZXIucXVlcnlTZWxlY3RvcihcclxuICAgICAgICAgICAgICAgIFwiW25hbWU9dm9yb25vaV0gLm1vZGFsLWNvbnRleHQtbWVudS1pdGVtLWNoZWNrXCIsXHJcbiAgICAgICAgICAgICAgKS50ZXh0Q29udGVudCA9IFwi4pyTXCJcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8g44Ki44Km44K/44O844KS44Kv44Oq44OD44Kv44GX44Gf44Go44GN44Oh44OL44Ol44O844KS5raI44GZXHJcbiAgICAgICAgICAgIGVsX3dyYXBwZXIuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICBlbF93cmFwcGVyLnJlbW92ZSgpXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8g44Kz44Km44Oi44Oq44Gu6aeQ6LuK5aC044Gg44Gj44Gf5aC05ZCI44Gv5L6L5aSW5Yem55CGXHJcbiAgICAgICAgaWYgKHVuaXRfbmFtZSA9PT0gXCJDb29wU2FrZXJvY2tldEp1bXBQb2ludFwiKSB7XHJcbiAgICAgICAgICByb2NrZXRfanVtcF9wb2ludF9tYXBbbGFiZWxdID0ge1xyXG4gICAgICAgICAgICBvYmosXHJcbiAgICAgICAgICAgIHg6IHhweCxcclxuICAgICAgICAgICAgeTogeXB4LFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcm9ja2V0X2xpbmtzLmZvckVhY2goKHN0cikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIXN0ci5pbmNsdWRlcyhsYWJlbCkpIHtcclxuICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBzdHIucmVwbGFjZShsYWJlbCwgXCJcIilcclxuICAgICAgICAgICAgaWYgKCFvYmpbXCJMaW5rTGFiZWxzXCJdKSB7XHJcbiAgICAgICAgICAgICAgb2JqW1wiTGlua0xhYmVsc1wiXSA9IFtdXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb2JqW1wiTGlua0xhYmVsc1wiXS5wdXNoKHRhcmdldClcclxuICAgICAgICAgICAgb2JqW1wiTGFiZWxcIl0gPSBsYWJlbFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIGNvbnN0IGVsX3NlYXJjaCA9IGNyZWF0ZV9tYXBfcG9pbnQoXHJcbiAgICAgICAgICAgIHhweCxcclxuICAgICAgICAgICAgeXB4LFxyXG4gICAgICAgICAgICBcIm1hcC1zZWFyY2hcIixcclxuICAgICAgICAgICAgdW5pdF9uYW1lLnJlcGxhY2UoXCJ7aX1cIiwgXCJcIiksXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgICBwb2ludF93cmFwcGVyLmFwcGVuZENoaWxkKGVsX3NlYXJjaClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIOODqeODmeODqyhBLCBCLCBDLCAuLi4p44KS6KGo56S644GZ44KLXHJcbiAgICAgICAgaWYgKHVuaXRfbmFtZSA9PT0gXCJDb29wU2FrZXJvY2tldEp1bXBQb2ludFwiKSB7XHJcbiAgICAgICAgICBjb25zdCBlbF9sYWJlbCA9IGNyZWF0ZV9tYXBfcG9pbnQoXHJcbiAgICAgICAgICAgIHhweCxcclxuICAgICAgICAgICAgeXB4LFxyXG4gICAgICAgICAgICBcIm1hcC1sYWJlbFwiLFxyXG4gICAgICAgICAgICB1bml0X25hbWUucmVwbGFjZShcIntpfVwiLCBcIlwiKSxcclxuICAgICAgICAgICAgbGFiZWwsXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgICBlbF9sYWJlbC51cGRhdGVfdHJhbnNmb3JtID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2FsZSA9IDEgLyAodHJhbnNmb3JtZXIuc3RhZ2Uuc2NhbGUgKiB0cmFuc2Zvcm1lci51c2VyLnNjYWxlKVxyXG4gICAgICAgICAgICBjb25zdCBhbmdsZSA9IC0odHJhbnNmb3JtZXIuc3RhZ2UuYW5nbGUgKyB0cmFuc2Zvcm1lci51c2VyLmFuZ2xlKVxyXG4gICAgICAgICAgICB0aGlzLnN0eWxlLnNldFByb3BlcnR5KFxyXG4gICAgICAgICAgICAgIFwidHJhbnNmb3JtXCIsXHJcbiAgICAgICAgICAgICAgYHRyYW5zbGF0ZSgtNTAlLCAwJSkgc2NhbGUoJHtzY2FsZX0pIHJvdGF0ZSgke2FuZ2xlfWRlZylgLFxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbF9sYWJlbC51cGRhdGVfdHJhbnNmb3JtKClcclxuICAgICAgICAgIGVsX2xhYmVsLnNldEF0dHJpYnV0ZShcImRhdGEtdW5pdFwiLCB1bml0X25hbWUucmVwbGFjZShcIntpfVwiLCBcIlwiKSlcclxuICAgICAgICAgIHBvaW50X3dyYXBwZXIuYXBwZW5kQ2hpbGQoZWxfbGFiZWwpXHJcbiAgICAgICAgICBmdW5jdGlvbiBzZXRfcmV2ZXJzZV90cmFuc2Zvcm0oZWwpIHt9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlfb2JqKytcclxuICAgICAgfSlcclxuICAgIH1cclxuICB9KVxyXG5cclxuICAvL1xyXG4gIC8vIOOCs+OCpuODouODquOBruaOpee2muWbs1xyXG4gIC8vXHJcblxyXG4gIHtcclxuICAgIGNvbnN0IGNhbnZhcyA9ICQoXCIjbWFwX2NhbnZhc19yb2NrZXRfbGlua1wiKVxyXG4gICAgY2FudmFzLndpZHRoID0gQ0FOVkFTX1dJRFRIXHJcbiAgICBjYW52YXMuaGVpZ2h0ID0gQ0FOVkFTX0hFSUdIVFxyXG4gICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKVxyXG4gICAgcm9ja2V0X2xpbmtzLmZvckVhY2goKHN0cikgPT4ge1xyXG4gICAgICBjb25zdCBwb3MxID0gcm9ja2V0X2p1bXBfcG9pbnRfbWFwW3N0ci5jaGFyQXQoMCldXHJcbiAgICAgIGNvbnN0IHBvczIgPSByb2NrZXRfanVtcF9wb2ludF9tYXBbc3RyLmNoYXJBdCgxKV1cclxuICAgICAgY3R4LmxpbmVXaWR0aCA9IDZcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjMDNhOWY0XCJcclxuICAgICAgY3R4LmJlZ2luUGF0aCgpXHJcbiAgICAgIGN0eC5tb3ZlVG8ocG9zMS54LCBwb3MxLnkpXHJcbiAgICAgIGN0eC5saW5lVG8ocG9zMi54LCBwb3MyLnkpXHJcbiAgICAgIGN0eC5zdHJva2UoKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIC8vXHJcbiAgLy8g44Kr44K/44OR44OD44OJ44Gu5o6l57aa5ZuzXHJcbiAgLy9cclxuXHJcbiAge1xyXG4gICAgY29uc3QgY2FudmFzID0gJChcIiNtYXBfY2FudmFzX2N1cHR3aW5zX2xpbmtcIilcclxuICAgIGNhbnZhcy53aWR0aCA9IENBTlZBU19XSURUSFxyXG4gICAgY2FudmFzLmhlaWdodCA9IENBTlZBU19IRUlHSFRcclxuICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcclxuXHJcbiAgICBvYmpfbWFwW1wiQ29vcEN1cFR3aW5zUmFpbFwiXS5mb3JFYWNoKChvYmopID0+IHtcclxuICAgICAgaWYgKG9ialtcIkxheWVyXCJdICE9PSB0aWRlKSB7XHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgcmFpbF9wb2ludHMgPSBvYmpbXCJSYWlsUG9pbnRzXCJdIHx8IG9ialtcIlBvaW50c1wiXVxyXG4gICAgICBjdHguYmVnaW5QYXRoKClcclxuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjZjQ0MzM2XCJcclxuICAgICAgY3R4LmxpbmVXaWR0aCA9IDJcclxuICAgICAgLy9jdHgubW92ZVRvKHgsIHopO1xyXG4gICAgICBjb25zdCB4MSA9XHJcbiAgICAgICAgQ0FOVkFTX0NFTlRFUl9YICsgRihyYWlsX3BvaW50c1swXVtcIlRyYW5zbGF0ZVwiXVtcIjBcIl0pICogUFhfUEVSX01FVEVSXHJcbiAgICAgIGNvbnN0IHoxID1cclxuICAgICAgICBDQU5WQVNfQ0VOVEVSX1kgKyBGKHJhaWxfcG9pbnRzWzBdW1wiVHJhbnNsYXRlXCJdW1wiMlwiXSkgKiBQWF9QRVJfTUVURVJcclxuICAgICAgY3R4Lm1vdmVUbyh4MSwgejEpXHJcbiAgICAgIGNvbnN0IGxlbiA9IHJhaWxfcG9pbnRzLmxlbmd0aFxyXG4gICAgICAvLyBjb25zdCBsYXN0ID0gb2JqWydVbml0Q29uZmlnTmFtZSddLmluY2x1ZGVzKCdQaW5rJykgPyBsZW4gOiBsZW4gKyAxO1xyXG4gICAgICBjb25zdCBsYXN0ID0gbGVuICsgMVxyXG4gICAgICBpZiAoIShcIkNvbnRyb2wwXCIgaW4gcmFpbF9wb2ludHNbMF0pKSB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBsYXN0OyBpKyspIHtcclxuICAgICAgICAgIGNvbnN0IGkyID0gKGkgLSAwKSAlIGxlblxyXG4gICAgICAgICAgY29uc3QgcDIgPSByYWlsX3BvaW50c1tpMl1cclxuICAgICAgICAgIGNvbnN0IHgyID0gQ0FOVkFTX0NFTlRFUl9YICsgRihwMltcIlRyYW5zbGF0ZVwiXVtcIjBcIl0pICogUFhfUEVSX01FVEVSXHJcbiAgICAgICAgICBjb25zdCB6MiA9IENBTlZBU19DRU5URVJfWSArIEYocDJbXCJUcmFuc2xhdGVcIl1bXCIyXCJdKSAqIFBYX1BFUl9NRVRFUlxyXG4gICAgICAgICAgY3R4LmxpbmVUbyh4MiwgejIpXHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbGFzdDsgaSsrKSB7XHJcbiAgICAgICAgICBjb25zdCBpMSA9IChpIC0gMSkgJSBsZW5cclxuICAgICAgICAgIGNvbnN0IGkyID0gKGkgLSAwKSAlIGxlblxyXG4gICAgICAgICAgY29uc3QgcDEgPSByYWlsX3BvaW50c1tpMV1cclxuICAgICAgICAgIGNvbnN0IHAyID0gcmFpbF9wb2ludHNbaTJdXHJcbiAgICAgICAgICBjb25zdCBjMXggPSBwMVtcIkNvbnRyb2wxXCJdXHJcbiAgICAgICAgICAgID8gcDFbXCJDb250cm9sMVwiXVtcIjBcIl1cclxuICAgICAgICAgICAgOiBwMVtcIlRyYW5zbGF0ZVwiXVtcIjBcIl1cclxuICAgICAgICAgIGNvbnN0IGMxeiA9IHAxW1wiQ29udHJvbDFcIl1cclxuICAgICAgICAgICAgPyBwMVtcIkNvbnRyb2wxXCJdW1wiMlwiXVxyXG4gICAgICAgICAgICA6IHAxW1wiVHJhbnNsYXRlXCJdW1wiMlwiXVxyXG4gICAgICAgICAgY29uc3QgYzJ4ID0gcDJbXCJDb250cm9sMFwiXVxyXG4gICAgICAgICAgICA/IHAyW1wiQ29udHJvbDBcIl1bXCIwXCJdXHJcbiAgICAgICAgICAgIDogcDJbXCJUcmFuc2xhdGVcIl1bXCIwXCJdXHJcbiAgICAgICAgICBjb25zdCBjMnogPSBwMltcIkNvbnRyb2wwXCJdXHJcbiAgICAgICAgICAgID8gcDJbXCJDb250cm9sMFwiXVtcIjJcIl1cclxuICAgICAgICAgICAgOiBwMltcIlRyYW5zbGF0ZVwiXVtcIjJcIl1cclxuICAgICAgICAgIGNvbnN0IGMxID0ge1xyXG4gICAgICAgICAgICB4OiBQWF9QRVJfTUVURVIgKiBjMXggKyBDQU5WQVNfQ0VOVEVSX1gsXHJcbiAgICAgICAgICAgIHo6IFBYX1BFUl9NRVRFUiAqIGMxeiArIENBTlZBU19DRU5URVJfWSxcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNvbnN0IGMyID0ge1xyXG4gICAgICAgICAgICB4OiBQWF9QRVJfTUVURVIgKiBjMnggKyBDQU5WQVNfQ0VOVEVSX1gsXHJcbiAgICAgICAgICAgIHo6IFBYX1BFUl9NRVRFUiAqIGMyeiArIENBTlZBU19DRU5URVJfWSxcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNvbnN0IHgyID0gUFhfUEVSX01FVEVSICogcDJbXCJUcmFuc2xhdGVcIl1bXCIwXCJdICsgQ0FOVkFTX0NFTlRFUl9YXHJcbiAgICAgICAgICBjb25zdCB6MiA9IFBYX1BFUl9NRVRFUiAqIHAyW1wiVHJhbnNsYXRlXCJdW1wiMlwiXSArIENBTlZBU19DRU5URVJfWVxyXG4gICAgICAgICAgY3R4LmJlemllckN1cnZlVG8oYzEueCwgYzEueiwgYzIueCwgYzIueiwgeDIsIHoyKVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBjdHguc3Ryb2tlKClcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICog55S76Z2i5YWo5L2T44Gu44K544Kx44O844Or44KS5pu05pawXHJcbiAqL1xyXG5mdW5jdGlvbiBkcmF3X3NjYWxlX3NjcmVlbigpIHtcclxuICBjb25zdCBlbF9zdmdfZyA9ICQoXCIjc3ZnX3NjYWxlX3NjcmVlbl9nXCIpXHJcblxyXG4gIGNvbnN0IGN4ID0gSShmaXR0ZXIuY2FjaGUubWFpbi53aWR0aCAvIDIpXHJcbiAgY29uc3QgY3kgPSBJKGZpdHRlci5jYWNoZS5tYWluLmhlaWdodCAvIDIpXHJcbiAgY29uc3QgdyA9IGZpdHRlci5jYWNoZS5tYWluLndpZHRoXHJcbiAgY29uc3QgaCA9IGZpdHRlci5jYWNoZS5tYWluLmhlaWdodFxyXG4gIGNvbnN0IGYgPSBNYXRoLm1heCh3LCBoKVxyXG5cclxuICAvLyDot53pm6LljZjkvY3jga7lpInmj5vjg6zjg7zjg4jjga/ku6XkuItcclxuICAvLyAx5pysID0gODBweCA9IDVtID0gNTBEVVxyXG4gIC8vIDHmnKwgIC4uLiDoqablsITloLTjg6njgqTjg7Mx5pys5YiG44Gu6Led6ZuiXHJcbiAgLy8gODBweCAuLi4g44K544OG44O844K455S75YOP57Sg5p2QKDM4NDAqMzg0MCnjga7jgYbjgaHjga44MHB45YiGXHJcbiAgLy8gNW0gICAuLi4g44K544OG44O844K444GuM0Tjg6Ljg4fjg6vjgpJCbGVuZGVy44Gn6ZaL44GE44Gf44Go44GN44GuNW3liIZcclxuICAvLyA1MERVIC4uLiBEVeOBr+OCueODl+ODqTLjga7mpJzoqLzoqJjkuovjgafjgZfjgbDjgZfjgbDkvb/jgo/jgozjgovot53pm6Ljga7ljZjkvY1cclxuICBjb25zdCBzY2FsZV93aWR0aCA9IDgwXHJcbiAgY29uc3Qgc2NhbGVfd2lkdGhfcmVzaXplZCA9XHJcbiAgICBzY2FsZV93aWR0aCAqXHJcbiAgICB0cmFuc2Zvcm1lci5jYW52YXMuc2NhbGUgKlxyXG4gICAgdHJhbnNmb3JtZXIuc3RhZ2Uuc2NhbGUgKlxyXG4gICAgdHJhbnNmb3JtZXIudXNlci5zY2FsZVxyXG4gIGNvbnN0IHNjYWxlX3ZlcnRpY2FsX251bSA9IE1hdGguY2VpbChjeCAvIHNjYWxlX3dpZHRoX3Jlc2l6ZWQpXHJcbiAgY29uc3Qgc2NhbGVfaG9yaXpvbnRhbF9udW0gPSBNYXRoLmNlaWwoY3kgLyBzY2FsZV93aWR0aF9yZXNpemVkKVxyXG4gIGNvbnN0IHNjYWxlX2RpYWdvbmFsX251bSA9IE1hdGguY2VpbChcclxuICAgIGRpc3RhbmNlKDAsIDAsIGN4LCBjeSkgLyBzY2FsZV93aWR0aF9yZXNpemVkLFxyXG4gIClcclxuICBsZXQgaHRtbCA9IFwiXCJcclxuICBpZiAoc2F2ZXIuZGF0YS5jb25maWdbXCJpbnB1dC1kaXNwbGF5LXNjYWxlXCJdKSB7XHJcbiAgICBpZiAoc2F2ZXIuZGF0YS5jb25maWdbXCJzZWxlY3Qtc2NhbGUtdHlwZVwiXSAhPT0gXCJjaXJjbGVcIikge1xyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDI7IGkrKykge1xyXG4gICAgICAgIGNvbnN0IHNpZ24gPSBpID09PSAwID8gMSA6IC0xXHJcbiAgICAgICAgY29uc3Qgal9maXJzdCA9IGkgPT09IDAgPyAwIDogMVxyXG4gICAgICAgIGZvciAobGV0IGogPSBqX2ZpcnN0OyBqIDwgc2NhbGVfdmVydGljYWxfbnVtOyBqKyspIHtcclxuICAgICAgICAgIGNvbnN0IHggPSBJKGN4ICsgc2lnbiAqIGogKiBzY2FsZV93aWR0aF9yZXNpemVkKVxyXG4gICAgICAgICAgY29uc3QgZCA9IGBNICR7eH0gMCBMICR7eH0gJHtofWBcclxuICAgICAgICAgIGh0bWwgKz0gYDxwYXRoIGQ9XCIke2R9XCIgLz5gXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMjsgaSsrKSB7XHJcbiAgICAgICAgY29uc3Qgc2lnbiA9IGkgPT09IDAgPyAxIDogLTFcclxuICAgICAgICBjb25zdCBqX2ZpcnN0ID0gaSA9PT0gMCA/IDAgOiAxXHJcbiAgICAgICAgZm9yIChsZXQgaiA9IGpfZmlyc3Q7IGogPCBzY2FsZV9ob3Jpem9udGFsX251bTsgaisrKSB7XHJcbiAgICAgICAgICBjb25zdCB5ID0gSShjeSArIHNpZ24gKiBqICogc2NhbGVfd2lkdGhfcmVzaXplZClcclxuICAgICAgICAgIGNvbnN0IGQgPSBgTSAwICR7eX0gTCAke3d9ICR7eX1gXHJcbiAgICAgICAgICBodG1sICs9IGA8cGF0aCBkPVwiJHtkfVwiIC8+YFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBzY2FsZV9kaWFnb25hbF9udW07IGkrKykge1xyXG4gICAgICAgIGNvbnN0IHIgPSBJKGkgKiBzY2FsZV93aWR0aF9yZXNpemVkKVxyXG4gICAgICAgIGxldCBzdHlsZSA9IFwiXCJcclxuICAgICAgICBpZiAoaSAlIDUgPT09IDApIHtcclxuICAgICAgICAgIHN0eWxlID0gXCJzdHJva2Utd2lkdGg6IDNweDtcIlxyXG4gICAgICAgICAgY29uc3QgbSA9IHJlbV90b19weCgwLjIpXHJcbiAgICAgICAgICBodG1sICs9IGA8dGV4dCB4PVwiJHtjeCArIG19XCIgeT1cIiR7XHJcbiAgICAgICAgICAgIGN5IC0gciAtIG1cclxuICAgICAgICAgIH1cIiBzdHlsZT1cImZvbnQtc2l6ZTogMXJlbVwiIGZpbGw9XCJjdXJyZW50Q29sb3JcIj4ke2l9PC90ZXh0PmBcclxuICAgICAgICAgIGh0bWwgKz0gYDx0ZXh0IHg9XCIke2N4ICsgciArIG19XCIgeT1cIiR7XHJcbiAgICAgICAgICAgIGN5IC0gbVxyXG4gICAgICAgICAgfVwiIHN0eWxlPVwiZm9udC1zaXplOiAxcmVtXCIgZmlsbD1cImN1cnJlbnRDb2xvclwiPiR7aX08L3RleHQ+YFxyXG4gICAgICAgIH1cclxuICAgICAgICBodG1sICs9IGA8Y2lyY2xlIGN4PVwiJHtjeH1cIiBjeT1cIiR7Y3l9XCIgcj1cIiR7cn1cIiBzdHlsZT1cIiR7c3R5bGV9XCIgLz5gXHJcbiAgICAgIH1cclxuICAgICAgaHRtbCArPSBgPGxpbmUgeDE9XCIkey1mfVwiIHkxPVwiJHtjeX1cIiB4Mj1cIiR7Zn1cIiB5Mj1cIiR7Y3l9XCIgc3R5bGU9XCJ0cmFuc2Zvcm06IHJvdGF0ZSgrNDVkZWcpOyB0cmFuc2Zvcm0tb3JpZ2luOiBjZW50ZXIgY2VudGVyO1wiIC8+YFxyXG4gICAgICBodG1sICs9IGA8bGluZSB4MT1cIiR7LWZ9XCIgeTE9XCIke2N5fVwiIHgyPVwiJHtmfVwiIHkyPVwiJHtjeX1cIiBzdHlsZT1cInRyYW5zZm9ybTogcm90YXRlKC00NWRlZyk7IHRyYW5zZm9ybS1vcmlnaW46IGNlbnRlciBjZW50ZXI7XCIgLz5gXHJcbiAgICAgIGh0bWwgKz0gYDxsaW5lIHgxPVwiJHstZn1cIiB5MT1cIiR7Y3l9XCIgeDI9XCIke2Z9XCIgeTI9XCIke2N5fVwiIHN0eWxlPVwidHJhbnNmb3JtOiByb3RhdGUoKzkwZGVnKTsgdHJhbnNmb3JtLW9yaWdpbjogY2VudGVyIGNlbnRlcjtcIiAvPmBcclxuICAgICAgaHRtbCArPSBgPGxpbmUgeDE9XCIkey1mfVwiIHkxPVwiJHtjeX1cIiB4Mj1cIiR7Zn1cIiB5Mj1cIiR7Y3l9XCIgc3R5bGU9XCJ0cmFuc2Zvcm06IHJvdGF0ZSgtMDBkZWcpOyB0cmFuc2Zvcm0tb3JpZ2luOiBjZW50ZXIgY2VudGVyO1wiIC8+YFxyXG4gICAgfVxyXG4gIH1cclxuICBlbF9zdmdfZy5pbm5lckhUTUwgPSBodG1sXHJcbn1cclxud2luZG93LmRyYXdfc2NhbGVfc2NyZWVuID0gZHJhd19zY2FsZV9zY3JlZW5cclxuXHJcbi8qKlxyXG4gKiDnlLvpnaLlt6bkuIvjga7jgrnjgrHjg7zjg6vjgpLmm7TmlrBcclxuICovXHJcbmZ1bmN0aW9uIGRyYXdfc2NhbGVfbGVmdF9ib3R0b20oKSB7XHJcbiAgY29uc3QgZWxfc3ZnID0gJChcIiNzdmdfc2NhbGVfbGVmdF9ib3R0b21cIilcclxuXHJcbiAgLy8gODBweCA9IDVtID0gNTBEVSA9IDHmnKxcclxuICBjb25zdCBzY2FsZV93aWR0aCA9IDgwXHJcbiAgY29uc3Qgc2NhbGVfd2lkdGhfcmVzaXplZCA9XHJcbiAgICBzY2FsZV93aWR0aCAqXHJcbiAgICB0cmFuc2Zvcm1lci5jYW52YXMuc2NhbGUgKlxyXG4gICAgdHJhbnNmb3JtZXIuc3RhZ2Uuc2NhbGUgKlxyXG4gICAgdHJhbnNmb3JtZXIudXNlci5zY2FsZVxyXG4gIGNvbnN0IHNjYWxlX251bSA9IDVcclxuICBjb25zdCBzY2FsZV94ID0gMTBcclxuICBjb25zdCBzY2FsZV95ID0gMjBcclxuICBjb25zdCBzY2FsZV9oID0gTWF0aC5taW4oNiwgcGFyc2VJbnQoc2NhbGVfd2lkdGhfcmVzaXplZCAvIDQpKVxyXG4gIGNvbnN0IHkwID0gc2NhbGVfeSArIHNjYWxlX2hcclxuICBjb25zdCB5MSA9IHNjYWxlX3lcclxuICBsZXQgZCA9IFwiXCJcclxuICBmb3IgKGxldCBpID0gMDsgaSA8IHNjYWxlX251bTsgaSsrKSB7XHJcbiAgICBjb25zdCBjID0gaSA9PT0gMCA/IFwiTVwiIDogXCJMXCJcclxuICAgIGNvbnN0IHgwID0gc2NhbGVfeCArIHNjYWxlX3dpZHRoX3Jlc2l6ZWQgKiBpXHJcbiAgICBjb25zdCB4MSA9IHNjYWxlX3ggKyBzY2FsZV93aWR0aF9yZXNpemVkICogKGkgKyAxKVxyXG4gICAgZCArPSBgJHtjfSAke3gwfSAke3kwfSBMICR7eDB9ICR7eTF9IEwgJHt4MX0gJHt5MX1gXHJcbiAgfVxyXG4gIGQgKz0gYEwgJHtzY2FsZV94ICsgc2NhbGVfd2lkdGhfcmVzaXplZCAqIHNjYWxlX251bX0gJHt5MH1gXHJcbiAgbGV0IGh0bWwgPSBcIlwiXHJcbiAgaHRtbCArPSBgPHBhdGggZD1cIiR7ZH1cIiAvPmBcclxuICBlbF9zdmcuaW5uZXJIVE1MID0gaHRtbFxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3KCkge1xyXG4gIC8vIGNvbnN0IGNhbnZhc19iZyA9ICQoJyNtYXBfY2FudmFzX2JnJyk7XHJcbiAgLy8gY2FudmFzX2JnLndpZHRoID0gQ0FOVkFTX1dJRFRIO1xyXG4gIC8vIGNhbnZhc19iZy5oZWlnaHQgPSBDQU5WQVNfSEVJR0hUO1xyXG4gIC8vIGNvbnN0IGN0eF9iZyA9IGNhbnZhc19iZy5nZXRDb250ZXh0KCcyZCcpO1xyXG4gIC8vIGN0eF9iZy5saW5lV2lkdGggPSA0O1xyXG4gIC8vIGN0eF9iZy5saW5lQ2FwID0gJ2J1dHQnO1xyXG4gIC8vIGN0eF9iZy5zdHJva2VTdHlsZSA9ICdibGFjayc7XHJcbiAgLy8gY3R4X2JnLmJlZ2luUGF0aCgpO1xyXG4gIC8vIGN0eF9iZy5tb3ZlVG8oMTAwLCAxMDApO1xyXG4gIC8vIGN0eF9iZy5saW5lVG8oMTAwLCAyMDApO1xyXG4gIC8vIGN0eF9iZy5zdHJva2UoKTtcclxuICAvLyBjb25zdCBwb2ludF93cmFwcGVyID0gJChcIiNtYXBfcG9pbnRfd3JhcHBlclwiKVxyXG4gIC8vIGNvbnN0IGNhbnZhcyA9ICQoXCIjbWFwX2NhbnZhc192b3Jvbm9pXCIpXHJcbiAgLy8gY2FudmFzLndpZHRoID0gQ0FOVkFTX1dJRFRIXHJcbiAgLy8gY2FudmFzLmhlaWdodCA9IENBTlZBU19IRUlHSFRcclxuICAvLyBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpXHJcbiAgLy8gb2JqX21hcFtcIkNvb3BTYWtlcm9ja2V0SnVtcFBvaW50XCJdLmZvckVhY2goKG9iaikgPT4ge1xyXG4gIC8vICAgaWYgKG9ialtcIkxheWVyXCJdICE9PSBcIkxvd1wiKSByZXR1cm5cclxuICAvLyAgIGNvbnN0IHggPSBGKG9ialtcIlRyYW5zbGF0ZVwiXVtcIjBcIl0pXHJcbiAgLy8gICBjb25zdCB5ID0gRihvYmpbXCJUcmFuc2xhdGVcIl1bXCIyXCJdKVxyXG4gIC8vICAgY29uc3QgeHB4ID0gQ0FOVkFTX0NFTlRFUl9YICsgeCAqIFBYX1BFUl9NRVRFUlxyXG4gIC8vICAgY29uc3QgeXB4ID0gQ0FOVkFTX0NFTlRFUl9ZICsgeSAqIFBYX1BFUl9NRVRFUlxyXG4gIC8vICAgY29uc3QgZWxtID0gY3JlYXRlX21hcF9wb2ludCh4cHgsIHlweClcclxuICAvLyAgIGVsbS5vbmNsaWNrID0gKCkgPT4ge1xyXG4gIC8vICAgICBjb25zb2xlLmxvZyhvYmpbXCJIYXNoXCJdKVxyXG4gIC8vICAgICBjb25zb2xlLmxvZyhvYmopXHJcbiAgLy8gICB9XHJcbiAgLy8gICBjb25zdCBsaW5rX2NvdW50ID0gb2JqW1wiTGlua3NcIl0gPyBvYmpbXCJMaW5rc1wiXS5sZW5ndGggOiAwXHJcbiAgLy8gICBjb25zdCBvYmoyX2xpc3QgPSBbXVxyXG4gIC8vICAgb2JqX21hcFtcIkNvb3BTYWtlcm9ja2V0SnVtcFBvaW50XCJdLmZvckVhY2goKG9iajIpID0+IHtcclxuICAvLyAgICAgaWYgKG9iajJbXCJMYXllclwiXSAhPT0gXCJMb3dcIikgcmV0dXJuXHJcbiAgLy8gICAgIGlmIChvYmogPT09IG9iajIpIHJldHVyblxyXG4gIC8vICAgICBjb25zdCB4MiA9IEYob2JqMltcIlRyYW5zbGF0ZVwiXVtcIjBcIl0pXHJcbiAgLy8gICAgIGNvbnN0IHkyID0gRihvYmoyW1wiVHJhbnNsYXRlXCJdW1wiMlwiXSlcclxuICAvLyAgICAgY29uc3QgciA9IE1hdGguc3FydCgoeCAtIHgyKSAqICh4IC0geDIpICsgKHkgLSB5MikgKiAoeSAtIHkyKSlcclxuICAvLyAgICAgb2JqMl9saXN0LnB1c2goe1xyXG4gIC8vICAgICAgIG86IG9iajIsXHJcbiAgLy8gICAgICAgcixcclxuICAvLyAgICAgfSlcclxuICAvLyAgIH0pXHJcbiAgLy8gICBvYmoyX2xpc3Quc29ydCgoYSwgYikgPT4ge1xyXG4gIC8vICAgICByZXR1cm4gYS5yID4gYi5yID8gMSA6IC0xXHJcbiAgLy8gICB9KVxyXG4gIC8vICAgY29uc3QganVtcF9saXN0ID0gW11cclxuICAvLyAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGlua19jb3VudDsgaSsrKSB7XHJcbiAgLy8gICAgIGp1bXBfbGlzdC5wdXNoKG9iajJfbGlzdFtpXS5vKVxyXG4gIC8vICAgfVxyXG4gIC8vICAganVtcF9saXN0LmZvckVhY2goKG9iajIpID0+IHtcclxuICAvLyAgICAgY29uc3QgeDIgPSBGKG9iajJbXCJUcmFuc2xhdGVcIl1bXCIwXCJdKVxyXG4gIC8vICAgICBjb25zdCB5MiA9IEYob2JqMltcIlRyYW5zbGF0ZVwiXVtcIjJcIl0pXHJcbiAgLy8gICAgIGNvbnN0IHgycHggPSBDQU5WQVNfQ0VOVEVSX1ggKyB4MiAqIFBYX1BFUl9NRVRFUlxyXG4gIC8vICAgICBjb25zdCB5MnB4ID0gQ0FOVkFTX0NFTlRFUl9ZICsgeTIgKiBQWF9QRVJfTUVURVJcclxuICAvLyAgICAgY3R4LmxpbmVXaWR0aCA9IDEwXHJcbiAgLy8gICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIlxyXG4gIC8vICAgICBjdHguYmVnaW5QYXRoKClcclxuICAvLyAgICAgY3R4Lm1vdmVUbyh4cHgsIHlweClcclxuICAvLyAgICAgY3R4LmxpbmVUbyh4MnB4LCB5MnB4KVxyXG4gIC8vICAgICBjdHguc3Ryb2tlKClcclxuICAvLyAgIH0pXHJcbiAgLy8gICBwb2ludF93cmFwcGVyLmFwcGVuZENoaWxkKGVsbSlcclxuICAvLyB9KVxyXG4gIC8vIGRyYXdfdm9yb25vaSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3X3Zvcm9ub2kocm9ja2V0X2xhYmVsID0gXCJBXCIpIHtcclxuICBjb25zdCBjYW52YXMgPSAkKFwiI21hcF9jYW52YXNfdm9yb25vaVwiKVxyXG4gIGNhbnZhcy53aWR0aCA9IENBTlZBU19XSURUSFxyXG4gIGNhbnZhcy5oZWlnaHQgPSBDQU5WQVNfSEVJR0hUXHJcbiAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKVxyXG5cclxuICBpZiAoY3VycmVudF92b3Jvbm9pX2xhYmVsID09PSByb2NrZXRfbGFiZWwpIHtcclxuICAgIGN1cnJlbnRfdm9yb25vaV9sYWJlbCA9IFwiXCJcclxuICAgIHJldHVyblxyXG4gIH1cclxuXHJcbiAgY3VycmVudF92b3Jvbm9pX2xhYmVsID0gcm9ja2V0X2xhYmVsXHJcblxyXG4gIGNvbnN0IHBvaW50cyA9IFtdXHJcbiAgY29uc3QgZGVmID0gcm9ja2V0X2p1bXBfcG9pbnRfbWFwW3JvY2tldF9sYWJlbF0ub2JqXHJcbiAgZGVmW1wiTGlua0xhYmVsc1wiXS5mb3JFYWNoKChsYWJlbCkgPT4ge1xyXG4gICAgcG9pbnRzLnB1c2gocm9ja2V0X2p1bXBfcG9pbnRfbWFwW2xhYmVsXSlcclxuICB9KVxyXG5cclxuICBpZiAoIXBvaW50cy5sZW5ndGgpIHtcclxuICAgIHJldHVyblxyXG4gIH1cclxuXHJcbiAgY29uc3QgZGlhZ3JhbSA9IHZvcm9ub2kuY29tcHV0ZShwb2ludHMsIHtcclxuICAgIHhsOiAwLFxyXG4gICAgeHI6IENBTlZBU19XSURUSCxcclxuICAgIHl0OiAwLFxyXG4gICAgeWI6IENBTlZBU19IRUlHSFQsXHJcbiAgfSlcclxuICAvLyBjdHguY2xlYXJSZWN0KDAsIDAsIENBTlZBU19XSURUSCwgQ0FOVkFTX0hFSUdIVCk7XHJcbiAgLy8gc2VlIGh0dHA6Ly9oYWNraXN0LmpwLz9wPTMwNlxyXG4gIGN0eC5zYXZlKClcclxuICBjdHguZ2xvYmFsQWxwaGEgPSAwLjZcclxuICBjdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJtdWx0aXBseVwiXHJcbiAgY29uc3QgbmV3X2NlbGxzID0gW11cclxuICBjb25zdCBjZWxsc2xlbiA9IGRpYWdyYW0uY2VsbHMubGVuZ3RoXHJcbiAgZm9yIChsZXQgY2VsbF9pZCA9IDA7IGNlbGxfaWQgPCBjZWxsc2xlbjsgY2VsbF9pZCsrKSB7XHJcbiAgICB2YXIgbmV3X2NlbGwgPSBbXVxyXG4gICAgdmFyIGNlbGwgPSBkaWFncmFtLmNlbGxzW2NlbGxfaWRdXHJcbiAgICB2YXIgaGFsZmVkZ2VsZW4gPSBjZWxsLmhhbGZlZGdlcy5sZW5ndGhcclxuICAgIGZvciAobGV0IGhhbGZlZGdlX2lkID0gMDsgaGFsZmVkZ2VfaWQgPCBoYWxmZWRnZWxlbjsgaGFsZmVkZ2VfaWQrKykge1xyXG4gICAgICB2YXIgcDEgPSBjZWxsLmhhbGZlZGdlc1toYWxmZWRnZV9pZF0uZWRnZS52YVxyXG4gICAgICB2YXIgcDIgPSBjZWxsLmhhbGZlZGdlc1toYWxmZWRnZV9pZF0uZWRnZS52YlxyXG4gICAgICB2YXIgbnAxID1cclxuICAgICAgICBoYWxmZWRnZV9pZCA9PSAwXHJcbiAgICAgICAgICA/IGNlbGwuaGFsZmVkZ2VzW2hhbGZlZGdlX2lkICsgMV0uZWRnZS52YVxyXG4gICAgICAgICAgOiBjZWxsLmhhbGZlZGdlc1toYWxmZWRnZV9pZCAtIDFdLmVkZ2UudmFcclxuICAgICAgdmFyIG5wMiA9XHJcbiAgICAgICAgaGFsZmVkZ2VfaWQgPT0gMFxyXG4gICAgICAgICAgPyBjZWxsLmhhbGZlZGdlc1toYWxmZWRnZV9pZCArIDFdLmVkZ2UudmJcclxuICAgICAgICAgIDogY2VsbC5oYWxmZWRnZXNbaGFsZmVkZ2VfaWQgLSAxXS5lZGdlLnZiXHJcbiAgICAgIHZhciB0bXBfcCA9XHJcbiAgICAgICAgaGFsZmVkZ2VfaWQgPT0gMFxyXG4gICAgICAgICAgPyBwMSA9PSBucDEgfHwgcDEgPT0gbnAyXHJcbiAgICAgICAgICAgID8gcDJcclxuICAgICAgICAgICAgOiBwMVxyXG4gICAgICAgICAgOiBwMSA9PSBucDEgfHwgcDEgPT0gbnAyXHJcbiAgICAgICAgICA/IHAxXHJcbiAgICAgICAgICA6IHAyXHJcbiAgICAgIHZhciBuZXdfcCA9IHt9XHJcbiAgICAgIG5ld19wLnggPSB0bXBfcC54XHJcbiAgICAgIG5ld19wLnkgPSB0bXBfcC55XHJcbiAgICAgIG5ld19jZWxsLnB1c2gobmV3X3ApXHJcbiAgICB9XHJcbiAgICBuZXdfY2VsbHMucHVzaChuZXdfY2VsbClcclxuICB9XHJcbiAgbmV3X2NlbGxzLmZvckVhY2goKGNlbGwsIGkpID0+IHtcclxuICAgIGNvbnN0IENPTE9SU19WT1JPTk9JID0gW1xyXG4gICAgICBcInJnYigyNTUsNzUsMClcIixcclxuICAgICAgXCJyZ2IoMjU1LDI0MSwwKVwiLFxyXG4gICAgICBcInJnYigzLDE3NSwxMjIpXCIsXHJcbiAgICAgIFwicmdiKDAsOTAsMjU1KVwiLFxyXG4gICAgICBcInJnYig3NywxOTYsMjU1KVwiLFxyXG4gICAgICBcInJnYigyNTUsMTI4LDEzMClcIixcclxuICAgICAgXCJyZ2IoMjQ2LDE3MCwwKVwiLFxyXG4gICAgICBcInJnYigxNTMsMCwxNTMpXCIsXHJcbiAgICAgIFwicmdiKDEyOCw2NCwwKVwiLFxyXG4gICAgXVxyXG4gICAgY29uc3QgY29sb3IgPSBDT0xPUlNfVk9ST05PSVtpICUgQ09MT1JTX1ZPUk9OT0kubGVuZ3RoXVxyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yXHJcbiAgICBjdHguYmVnaW5QYXRoKClcclxuICAgIGNlbGwuZm9yRWFjaCgodmVydGV4LCBpKSA9PiB7XHJcbiAgICAgIGN0eFtpID09PSAwID8gXCJtb3ZlVG9cIiA6IFwibGluZVRvXCJdKHZlcnRleC54LCB2ZXJ0ZXgueSlcclxuICAgIH0pXHJcbiAgICBjdHguY2xvc2VQYXRoKClcclxuICAgIGN0eC5maWxsKClcclxuICB9KVxyXG4gIGN0eC5yZXN0b3JlKClcclxuICAvLyBpZiAoY2FudmFzU2V0dGluZy5tYXB0eXBlICE9PSAnZmxvb3JwbGFuJykge1xyXG4gIC8vICAgICBjdHggPSB2b3Jvbm9pQ3R4O1xyXG4gIC8vICAgICBjdHguc3Ryb2tlU3R5bGUgPSAnd2hpdGUnO1xyXG4gIC8vICAgICBjdHgubGluZVdpZHRoID0gMS41IC8gY2FudmFzU2V0dGluZy5zdGFnZVNjYWxlO1xyXG4gIC8vICAgICBjdHguc2hhZG93Qmx1ciA9IDQ7XHJcbiAgLy8gICAgIGN0eC5zaGFkb3dDb2xvciA9ICdyZ2JhKDAsIDAsIDAsIDAuNSknO1xyXG4gIC8vICAgICB2YXIgZGlhZ3JhbWxlbiA9IGRpYWdyYW0uZWRnZXMubGVuZ3RoO1xyXG4gIC8vICAgICBmb3IgKGkgPSAwOyBpIDwgZGlhZ3JhbWxlbjsgaSsrKSB7XHJcbiAgLy8gICAgICAgICB2YXIgcDEgPSBkaWFncmFtLmVkZ2VzW2ldLnZhO1xyXG4gIC8vICAgICAgICAgdmFyIHAyID0gZGlhZ3JhbS5lZGdlc1tpXS52YjtcclxuICAvLyAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAvLyAgICAgICAgIGN0eC5tb3ZlVG8ocDEueCwgcDEueSk7XHJcbiAgLy8gICAgICAgICBjdHgubGluZVRvKHAyLngsIHAyLnkpO1xyXG4gIC8vICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gIC8vICAgICB9XHJcbiAgLy8gICAgIGN0eC5zaGFkb3dCbHVyID0gMDtcclxuICAvLyAgICAgY3R4LnNoYWRvd0NvbG9yID0gJ3JnYmEoMCwgMCwgMCwgMCknO1xyXG4gIC8vICAgICBmb3IgKGkgPSAwOyBpIDwgZGlhZ3JhbWxlbjsgaSsrKSB7XHJcbiAgLy8gICAgICAgICB2YXIgcDEgPSBkaWFncmFtLmVkZ2VzW2ldLnZhO1xyXG4gIC8vICAgICAgICAgdmFyIHAyID0gZGlhZ3JhbS5lZGdlc1tpXS52YjtcclxuICAvLyAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAvLyAgICAgICAgIGN0eC5tb3ZlVG8ocDEueCwgcDEueSk7XHJcbiAgLy8gICAgICAgICBjdHgubGluZVRvKHAyLngsIHAyLnkpO1xyXG4gIC8vICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gIC8vICAgICB9XHJcbiAgLy8gfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVfbWFwX3BvaW50KHgsIHksIGNsYXNzbmFtZSwgdW5pdG5hbWUsIGNvbnRlbnQgPSBcIlwiKSB7XHJcbiAgY29uc3QgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXHJcbiAgZWwuY2xhc3NMaXN0LmFkZChjbGFzc25hbWUpXHJcbiAgZWwudGV4dENvbnRlbnQgPSBjb250ZW50XHJcbiAgZWwuc2V0QXR0cmlidXRlKFwiZGF0YS11bml0XCIsIHVuaXRuYW1lKVxyXG4gIGVsLnN0eWxlLnNldFByb3BlcnR5KFwibGVmdFwiLCBgJHt4fXB4YClcclxuICBlbC5zdHlsZS5zZXRQcm9wZXJ0eShcInRvcFwiLCBgJHt5fXB4YClcclxuICByZXR1cm4gZWxcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlX2VsZW1lbnRfZnJvbV9odG1sKGh0bWwpIHtcclxuICBjb25zdCB0ZW1wRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXHJcbiAgdGVtcEVsLmlubmVySFRNTCA9IGh0bWxcclxuICByZXR1cm4gdGVtcEVsLmZpcnN0RWxlbWVudENoaWxkXHJcbn1cclxuIiwiLyoqXG4gKiDlkITjgq3jg7zjgYzjgYTjgb7mirzjgZXjgozjgabjgYTjgovjgYvjganjgYbjgYvjgpLnrqHnkIbjgZnjgovovp7mm7hcbiAqIEtleWJvYXJkRXZlbnQua2V5IOOCkuOCreODvOOBqOOBmeOCi1xuICogQHR5cGUge3tzdHJpbmc6IGJvb2xlYW59fVxuICovXG5jb25zdCBrZXlib2FyZF9tYXAgPSB7fVxuXG4vKipcbiAqIOWQhOODnuOCpuOCueODnOOCv+ODs+OBjOOBhOOBvuaKvOOBleOCjOOBpuOBhOOCi+OBi+OBqeOBhuOBi+OCkueuoeeQhuOBmeOCi+i+nuabuFxuICogTW91c2VFdmVudC5idXR0b24g44KS44Kt44O844Go44GZ44KLXG4gKiBAdHlwZSB7e3N0cmluZzogYm9vbGVhbn19XG4gKi9cbmNvbnN0IG1vdXNlYnV0dG9uX21hcCA9IHt9XG5cbi8qKlxuICog44GE44G+44Kz44Oz44OI44Ot44O844Or44Kt44O844KS5oq844GX44Gm44GE44KL44GL44Gp44GG44GL44KS6L+U44GZXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNfY3RybCgpIHtcbiAgcmV0dXJuICEhKFxuICAgIGtleWJvYXJkX21hcFtcIkNvbnRyb2xcIl0gfHxcbiAgICBrZXlib2FyZF9tYXBbXCJDdHJsXCJdIHx8XG4gICAga2V5Ym9hcmRfbWFwW1wiQ3RsXCJdIHx8XG4gICAga2V5Ym9hcmRfbWFwW1wiQ29tbWFuZFwiXSB8fFxuICAgIGtleWJvYXJkX21hcFtcIuKMmFwiXSB8fFxuICAgIGtleWJvYXJkX21hcFtcIk1ldGFcIl1cbiAgKVxufVxuXG4vKipcbiAqIOOBhOOBvuOCt+ODleODiOOCreODvOOCkuaKvOOBl+OBpuOBhOOCi+OBi+OBqeOBhuOBi+OCkui/lOOBmVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzX3NoaWZ0KCkge1xuICByZXR1cm4gISFrZXlib2FyZF9tYXBbXCJTaGlmdFwiXVxufVxuXG4vKipcbiAqIOOBhOOBvuOCquODvOODq+ODiOOCreODvOOCkuaKvOOBl+OBpuOBhOOCi+OBi+OBqeOBhuOBi+OCkui/lOOBmVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzX2FsdCgpIHtcbiAgcmV0dXJuICEha2V5Ym9hcmRfbWFwW1wiQWx0XCJdXG59XG5cbi8qKlxuICog44Om44O844K244O85pON5L2c44KS5qSc5Ye644GZ44KL44Gf44KB44Gu44Kk44OZ44Oz44OI44K744OD44OI44KS6KGM44GGXG4gKi9cbmZ1bmN0aW9uIGluaXRfb3BlcmF0aW9uKCkge1xuICAvLyDjgqTjg5njg7Pjg4jjg4/jg7Pjg4njg6njgpLnmbvpjLLjgZnjgovopoHntKBcbiAgY29uc3QgZWwgPSB3aW5kb3dcblxuICAvL1xuICAvLyDjg57jgqbjgrnjg5zjgr/jg7Pjga7mirzkuIvnirbmhYvjgpLmpJzlh7pcbiAgLy9cblxuICBjb25zdCBoYW5kbGVyX21vdXNlZG93biA9IChlKSA9PiB7XG4gICAgbW91c2VidXR0b25fbWFwW2UuYnV0dG9uXSA9IGVcbiAgfVxuICBjb25zdCBoYW5kbGVyX21vdXNldXAgPSAoZSkgPT4ge1xuICAgIG1vdXNlYnV0dG9uX21hcFtlLmJ1dHRvbl0gPSBudWxsXG4gIH1cbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICBcImNvbnRleHRtZW51XCIsXG4gICAgKGUpID0+IHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIH0sXG4gICAgeyBwYXNzaXZlOiBmYWxzZSB9LFxuICApXG4gIGVsLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgaGFuZGxlcl9tb3VzZWRvd24pXG4gIGVsLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGhhbmRsZXJfbW91c2V1cClcbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlb3V0XCIsIGhhbmRsZXJfbW91c2V1cClcbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbGVhdmVcIiwgaGFuZGxlcl9tb3VzZXVwKVxuXG4gIC8vXG4gIC8vIOODnuOCpuOCueODm+OCpOODvOODq+aTjeS9nOOCkuaknOWHulxuICAvL1xuXG4gIGVsLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgXCJ3aGVlbFwiLFxuICAgIChlKSA9PiB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIGNvbnN0IGRlbHRhX3kgPSBNYXRoLnNpZ24oZS5kZWx0YVkpXG4gICAgICB0cmFuc2Zvcm1lci51c2VyLnNjYWxlICs9IGRlbHRhX3kgLyAyMFxuICAgICAgdHJhbnNmb3JtZXIudXNlci51cGRhdGVfY3NzKClcbiAgICAgIHRyYW5zZm9ybWVyLnVwZGF0ZV9zY2FsZSgpXG4gICAgfSxcbiAgICB7IHBhc3NpdmU6IGZhbHNlIH0sXG4gIClcblxuICAvL1xuICAvLyDjgq3jg7zjg5zjg7zjg4njga7mirzkuIvnirbmhYvjgpLmpJzlh7pcbiAgLy9cblxuICBlbC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZSkgPT4ge1xuICAgIGtleWJvYXJkX21hcFtlLmtleV0gPSB0cnVlXG4gIH0pXG5cbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIChlKSA9PiB7XG4gICAga2V5Ym9hcmRfbWFwW2Uua2V5XSA9IGZhbHNlXG4gIH0pXG59XG5cbi8qKlxuICog44K544Oe44Ob44Gu44K444Kn44K544OB44Oj44O85pON5L2c44KS5a6f6KOF44GZ44KLXG4gKi9cbmZ1bmN0aW9uIGluaXRfZ2VzdHVyZXMoKSB7XG4gIC8vIFBvaW50ZXJFdmVudCDjgpLmoLzntI3jgZfjgabjgYrjgY9cbiAgY29uc3QgZXZfY2FjaGUgPSBbXVxuXG4gIC8vIOOCpOODmeODs+ODiOODj+ODs+ODieODqeOCkueZu+mMsuOBmeOCi1xuICBjb25zdCBhZGQgPSAkKFwiI21hcF9ldmVudF9sYXllclwiKS5hZGRFdmVudExpc3RlbmVyXG4gIGFkZChcInBvaW50ZXJkb3duXCIsIHBvaW50ZXJkb3duX2hhbmRsZXIpXG4gIGFkZChcInBvaW50ZXJtb3ZlXCIsIHBvaW50ZXJtb3ZlX2hhbmRsZXIpXG4gIGFkZChcInBvaW50ZXJ1cFwiLCBwb2ludGVydXBfaGFuZGxlcilcbiAgYWRkKFwicG9pbnRlcmNhbmNlbFwiLCBwb2ludGVydXBfaGFuZGxlcilcbiAgYWRkKFwicG9pbnRlcm91dFwiLCBwb2ludGVydXBfaGFuZGxlcilcbiAgYWRkKFwicG9pbnRlcmxlYXZlXCIsIHBvaW50ZXJ1cF9oYW5kbGVyKVxuXG4gIC8vIOODneOCpOODs+OCv+ODvOODgOOCpuODs++8iOOCuOOCp+OCueODgeODo+ODvOaknOWHuumWi+Wni++8iVxuICBmdW5jdGlvbiBwb2ludGVyZG93bl9oYW5kbGVyKGUpIHtcbiAgICBpZiAoZS5wb2ludGVyVHlwZSAhPT0gXCJ0b3VjaFwiKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyDjgq3jg6Pjg4Pjgrfjg6XjgavjgZPjga7mjIfjga5Qb2ludGVyRXZlbnTjgpLoqJjpjLLjgZnjgotcbiAgICBldl9jYWNoZS5wdXNoKGUpXG4gIH1cblxuICAvLyDjg53jgqTjg7Pjgr/jg7zjgqLjg4Pjg5fvvIjjgrjjgqfjgrnjg4Hjg6Pjg7zmpJzlh7rntYLkuobvvIlcbiAgZnVuY3Rpb24gcG9pbnRlcnVwX2hhbmRsZXIoZSkge1xuICAgIGlmIChlLnBvaW50ZXJUeXBlICE9PSBcInRvdWNoXCIpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIOOCreODo+ODg+OCt+ODpeOBi+OCieOBk+OBruaMh+OBrlBvaW50ZXJFdmVudOOCkuWPluOCiumZpOOBj1xuICAgIHJlbW92ZV9ldmVudChlKVxuXG4gICAgLy8g44K/44OD44OB5Lit44Gu5oyH44GMMuacrOacqua6gOOBruWgtOWQiOOBr+OCuOOCp+OCueODgeODo+ODvOOCkuWIneacn+WMluOBmeOCi1xuICAgIGlmIChldl9jYWNoZS5sZW5ndGggPCAyKSB7XG4gICAgICBwaW5jaC5hY3RpdmUgPSBmYWxzZVxuICAgICAgcGluY2guaW5pdGlhbF9kaWZmID0gbnVsbFxuICAgICAgcGluY2guc3RhcnRpbmdfZGlmZiA9IG51bGxcbiAgICAgIHBpbmNoLnByZXZfZGlmZiA9IG51bGxcbiAgICAgIHBhbi5hY3RpdmUgPSBmYWxzZVxuICAgICAgcGFuLmluaXRpYWxfcG9zaXRpb25zWzBdLnggPSBudWxsXG4gICAgICBwYW4uaW5pdGlhbF9wb3NpdGlvbnNbMF0ueSA9IG51bGxcbiAgICAgIHBhbi5pbml0aWFsX3Bvc2l0aW9uc1sxXS54ID0gbnVsbFxuICAgICAgcGFuLmluaXRpYWxfcG9zaXRpb25zWzFdLnkgPSBudWxsXG4gICAgICBwYW4ucHJldl9wb3NpdGlvbnNbMF0ueCA9IG51bGxcbiAgICAgIHBhbi5wcmV2X3Bvc2l0aW9uc1swXS55ID0gbnVsbFxuICAgICAgcGFuLnByZXZfcG9zaXRpb25zWzFdLnggPSBudWxsXG4gICAgICBwYW4ucHJldl9wb3NpdGlvbnNbMV0ueSA9IG51bGxcbiAgICAgIHJvdGF0aW9uLmFjdGl2ZSA9IGZhbHNlXG4gICAgICByb3RhdGlvbi5pbml0aWFsX2FuZ2xlID0gbnVsbFxuICAgICAgcm90YXRpb24ucHJldl9hbmdsZSA9IG51bGxcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVfZXZlbnQoZSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZXZfY2FjaGUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChldl9jYWNoZVtpXS5wb2ludGVySWQgPT0gZS5wb2ludGVySWQpIHtcbiAgICAgICAgZXZfY2FjaGUuc3BsaWNlKGksIDEpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8g44Oe44OD44OX44Gu5pyA5L2O44K644O844Og546HXG4gIGNvbnN0IFRSQU5TRk9STV9VU0VSX01JTl9TQ0FMRSA9IDAuNFxuXG4gIC8vIOODlOODs+ODgeOCpOODs+ODu+ODlOODs+ODgeOCouOCpuODiOOBq+OCiOOCi+OCuuODvOODoOOCkueuoeeQhuOBmeOCi1xuICBjb25zdCBwaW5jaCA9IHtcbiAgICBhY3RpdmU6IGZhbHNlLFxuICAgIHRocmVzaG9sZDogNTAsXG4gICAgaW5pdGlhbF9kaWZmOiBudWxsLFxuICAgIHN0YXJ0aW5nX2RpZmY6IG51bGwsXG4gICAgcHJldl9kaWZmOiBudWxsLFxuICB9XG5cbiAgLy8g44OR44Oz44Gr44KI44KL44Oe44OD44OX56e75YuV44KS566h55CG44GZ44KLXG4gIGNvbnN0IHBhbiA9IHtcbiAgICBhY3RpdmU6IGZhbHNlLFxuICAgIHRocmVzaG9sZDogMCxcbiAgICBpbml0aWFsX3Bvc2l0aW9uczogW1xuICAgICAge1xuICAgICAgICB4OiBudWxsLFxuICAgICAgICB5OiBudWxsLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgeDogbnVsbCxcbiAgICAgICAgeTogbnVsbCxcbiAgICAgIH0sXG4gICAgXSxcbiAgICBwcmV2X3Bvc2l0aW9uczogW1xuICAgICAge1xuICAgICAgICB4OiBudWxsLFxuICAgICAgICB5OiBudWxsLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgeDogbnVsbCxcbiAgICAgICAgeTogbnVsbCxcbiAgICAgIH0sXG4gICAgXSxcbiAgfVxuXG4gIC8vIOWbnui7ouaTjeS9nOOCkueuoeeQhuOBmeOCi1xuICBjb25zdCByb3RhdGlvbiA9IHtcbiAgICB0aHJlc2hvbGQ6IDEyLFxuICAgIGFjdGl2ZTogZmFsc2UsXG4gICAgaW5pdGlhbF9hbmdsZTogbnVsbCxcbiAgICBwcmV2X2FuZ2xlOiBudWxsLFxuICB9XG5cbiAgLy8g44Od44Kk44Oz44K/44O844Og44O844OWXG4gIGZ1bmN0aW9uIHBvaW50ZXJtb3ZlX2hhbmRsZXIoZSkge1xuICAgIC8vIOOCv+ODg+ODgeOCpOODmeODs+ODiOOBp+OBquOBkeOCjOOBsOOCreODo+ODs+OCu+ODq1xuICAgIGlmIChlLnBvaW50ZXJUeXBlICE9PSBcInRvdWNoXCIpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIOOCreODo+ODg+OCt+ODpeOBq+S/neWtmOOBl+OBpuOBguOCi+OCpOODmeODs+ODiOOCkuabtOaWsFxuICAgIGNvbnN0IGluZGV4ID0gZXZfY2FjaGUuZmluZEluZGV4KFxuICAgICAgKGNhY2hlZF9lKSA9PiBjYWNoZWRfZS5wb2ludGVySWQgPT09IGUucG9pbnRlcklkLFxuICAgIClcbiAgICBldl9jYWNoZVtpbmRleF0gPSBlXG5cbiAgICAvLyAy5pys44Gu5oyH44Gn44K/44OD44OB44GX44Gm44GE44Gq44GE5aC05ZCI44Gv44Kt44Oj44Oz44K744OrXG4gICAgaWYgKGV2X2NhY2hlLmxlbmd0aCAhPT0gMikge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy9cbiAgICAvLyDlm57ou6Lli5XkvZxcbiAgICAvL1xuXG4gICAgY29uc3QgY3VyX3BvbGFyID0gdG9fcG9sYXIoXG4gICAgICBldl9jYWNoZVswXS5wYWdlWCAtIGV2X2NhY2hlWzFdLnBhZ2VYLFxuICAgICAgZXZfY2FjaGVbMF0ucGFnZVkgLSBldl9jYWNoZVsxXS5wYWdlWSxcbiAgICApXG4gICAgY29uc3QgY3VyX2FuZ2xlID0gY3VyX3BvbGFyLnRoZXRhXG4gICAgaWYgKHJvdGF0aW9uLmluaXRpYWxfYW5nbGUgPT09IG51bGwpIHtcbiAgICAgIHJvdGF0aW9uLmluaXRpYWxfYW5nbGUgPSBjdXJfYW5nbGVcbiAgICB9IGVsc2UgaWYgKCFyb3RhdGlvbi5hY3RpdmUpIHtcbiAgICAgIGlmIChNYXRoLmFicyhjdXJfYW5nbGUgLSByb3RhdGlvbi5pbml0aWFsX2FuZ2xlKSA+IHJvdGF0aW9uLnRocmVzaG9sZCkge1xuICAgICAgICByb3RhdGlvbi5hY3RpdmUgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBhbmdsZV9kaWZmID0gY3VyX2FuZ2xlIC0gcm90YXRpb24ucHJldl9hbmdsZVxuICAgICAgaWYgKE1hdGguYWJzKGFuZ2xlX2RpZmYpID4gMTgwKSB7XG4gICAgICAgIGFuZ2xlX2RpZmYgPVxuICAgICAgICAgIE1hdGgubWluKGN1cl9hbmdsZSwgcm90YXRpb24ucHJldl9hbmdsZSkgK1xuICAgICAgICAgIDM2MCAtXG4gICAgICAgICAgTWF0aC5tYXgoY3VyX2FuZ2xlLCByb3RhdGlvbi5wcmV2X2FuZ2xlKVxuICAgICAgICBhbmdsZV9kaWZmICo9IE1hdGguc2lnbihjdXJfYW5nbGUgLSByb3RhdGlvbi5wcmV2X2FuZ2xlKVxuICAgICAgfVxuICAgICAgdHJhbnNmb3JtZXIudXNlci5hbmdsZSArPSBhbmdsZV9kaWZmXG4gICAgICBjb25zdCByb3RhdGVkID0gcm90YXRlKHRyYW5zZm9ybWVyLnVzZXIueCwgdHJhbnNmb3JtZXIudXNlci55LCBhbmdsZV9kaWZmKVxuICAgICAgdHJhbnNmb3JtZXIudXNlci54ID0gcm90YXRlZC54XG4gICAgICB0cmFuc2Zvcm1lci51c2VyLnkgPSByb3RhdGVkLnlcbiAgICAgIHRyYW5zZm9ybWVyLnVzZXIudXBkYXRlX2NzcygpXG4gICAgfVxuICAgIHJvdGF0aW9uLnByZXZfYW5nbGUgPSBjdXJfYW5nbGVcblxuICAgIC8vXG4gICAgLy8g44OU44Oz44OB44Kk44Oz44O744OU44Oz44OB44Ki44Km44OI44Gr44KI44KL44K644O844Og44Kk44Oz44O744K644O844Og44Ki44Km44OI5Yem55CGXG4gICAgLy9cblxuICAgIC8vIOePvuWcqOOBrjLmnKzjga7mjIfjga7ot53pm6LjgpLoqIjmuKxcbiAgICBjb25zdCBjdXJfZGlmZiA9IGRpc3RhbmNlKFxuICAgICAgZXZfY2FjaGVbMF0ucGFnZVgsXG4gICAgICBldl9jYWNoZVswXS5wYWdlWSxcbiAgICAgIGV2X2NhY2hlWzFdLnBhZ2VYLFxuICAgICAgZXZfY2FjaGVbMV0ucGFnZVksXG4gICAgKVxuICAgIGlmIChwaW5jaC5pbml0aWFsX2RpZmYgPT09IG51bGwpIHtcbiAgICAgIHBpbmNoLmluaXRpYWxfZGlmZiA9IGN1cl9kaWZmXG4gICAgfSBlbHNlIGlmICghcGluY2guYWN0aXZlKSB7XG4gICAgICBpZiAoTWF0aC5hYnMocGluY2guaW5pdGlhbF9kaWZmIC0gY3VyX2RpZmYpID4gcGluY2gudGhyZXNob2xkKSB7XG4gICAgICAgIHBpbmNoLmFjdGl2ZSA9IHRydWVcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGVsdGFfZGlmZiA9IGN1cl9kaWZmIC0gcGluY2gucHJldl9kaWZmXG4gICAgICBjb25zdCBuZXdfc2NhbGUgPSB0cmFuc2Zvcm1lci51c2VyLnNjYWxlICsgZGVsdGFfZGlmZiAvIDIwMFxuICAgICAgdHJhbnNmb3JtZXIudXNlci5zY2FsZSA9IE1hdGgubWF4KFRSQU5TRk9STV9VU0VSX01JTl9TQ0FMRSwgbmV3X3NjYWxlKVxuICAgICAgdHJhbnNmb3JtZXIudXNlci51cGRhdGVfY3NzKClcbiAgICB9XG5cbiAgICBwaW5jaC5wcmV2X2RpZmYgPSBjdXJfZGlmZlxuXG4gICAgLy9cbiAgICAvLyDjg5Hjg7Pjgavjgojjgovjg4njg6njg4PjgrDlh6bnkIZcbiAgICAvL1xuXG4gICAgaWYgKHBhbi5pbml0aWFsX3Bvc2l0aW9uc1swXS54ID09PSBudWxsKSB7XG4gICAgICBwYW4uaW5pdGlhbF9wb3NpdGlvbnNbMF0ueCA9IGV2X2NhY2hlWzBdLnBhZ2VYXG4gICAgICBwYW4uaW5pdGlhbF9wb3NpdGlvbnNbMF0ueSA9IGV2X2NhY2hlWzBdLnBhZ2VZXG4gICAgICBwYW4uaW5pdGlhbF9wb3NpdGlvbnNbMV0ueCA9IGV2X2NhY2hlWzFdLnBhZ2VYXG4gICAgICBwYW4uaW5pdGlhbF9wb3NpdGlvbnNbMV0ueSA9IGV2X2NhY2hlWzFdLnBhZ2VZXG4gICAgfSBlbHNlIGlmICghcGFuLmFjdGl2ZSkge1xuICAgICAgY29uc3QgZDEgPSB7XG4gICAgICAgIHg6IGV2X2NhY2hlWzBdLnBhZ2VYIC0gcGFuLmluaXRpYWxfcG9zaXRpb25zWzBdLngsXG4gICAgICAgIHk6IGV2X2NhY2hlWzBdLnBhZ2VZIC0gcGFuLmluaXRpYWxfcG9zaXRpb25zWzBdLnksXG4gICAgICB9XG4gICAgICBjb25zdCBkMiA9IHtcbiAgICAgICAgeDogZXZfY2FjaGVbMV0ucGFnZVggLSBwYW4uaW5pdGlhbF9wb3NpdGlvbnNbMV0ueCxcbiAgICAgICAgeTogZXZfY2FjaGVbMV0ucGFnZVkgLSBwYW4uaW5pdGlhbF9wb3NpdGlvbnNbMV0ueSxcbiAgICAgIH1cbiAgICAgIGNvbnN0IHAxID0gdG9fcG9sYXIoZDEueCwgZDEueSlcbiAgICAgIGNvbnN0IHAyID0gdG9fcG9sYXIoZDIueCwgZDIueSlcbiAgICAgIGxldCBhbmdsZV9kaWZmID0gTWF0aC5hYnMocDEudGhldGEgLSBwMi50aGV0YSlcbiAgICAgIGlmIChhbmdsZV9kaWZmID4gMTgwKSB7XG4gICAgICAgIGFuZ2xlX2RpZmYgPVxuICAgICAgICAgIE1hdGgubWluKHAxLnRoZXRhLCBwMi50aGV0YSkgLSBNYXRoLm1heChwMS50aGV0YSwgcDIudGhldGEpICsgMzYwXG4gICAgICB9XG4gICAgICBjb25zdCBtb3ZlX2RpZmYgPSBNYXRoLmFicyhwMS5yIC0gcDIucilcbiAgICAgIGNvbnN0IG1vdmUgPSAocDEuciArIHAyLnIpIC8gMlxuICAgICAgaWYgKG1vdmUgPiBwaW5jaC50aHJlc2hvbGQgJiYgYW5nbGVfZGlmZiA8IDIwICYmIG1vdmVfZGlmZiA8IDIwKSB7XG4gICAgICAgIHBhbi5hY3RpdmUgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGR4MSA9IGV2X2NhY2hlWzBdLnBhZ2VYIC0gcGFuLnByZXZfcG9zaXRpb25zWzBdLnhcbiAgICAgIGNvbnN0IGR5MSA9IGV2X2NhY2hlWzBdLnBhZ2VZIC0gcGFuLnByZXZfcG9zaXRpb25zWzBdLnlcbiAgICAgIGNvbnN0IGR4MiA9IGV2X2NhY2hlWzFdLnBhZ2VYIC0gcGFuLnByZXZfcG9zaXRpb25zWzFdLnhcbiAgICAgIGNvbnN0IGR5MiA9IGV2X2NhY2hlWzFdLnBhZ2VZIC0gcGFuLnByZXZfcG9zaXRpb25zWzFdLnlcbiAgICAgIGNvbnN0IGR4ID0gKGR4MSArIGR4MikgLyAyXG4gICAgICBjb25zdCBkeSA9IChkeTEgKyBkeTIpIC8gMlxuICAgICAgY29uc3Qgcm90YXRlZCA9IHJvdGF0ZShkeCwgZHksIC10cmFuc2Zvcm1lci51c2VyLmFuZ2xlKVxuICAgICAgdHJhbnNmb3JtZXIudXNlci54ICs9IHJvdGF0ZWQueFxuICAgICAgdHJhbnNmb3JtZXIudXNlci55ICs9IHJvdGF0ZWQueVxuICAgICAgdHJhbnNmb3JtZXIudXNlci51cGRhdGVfY3NzKClcbiAgICB9XG4gICAgcGFuLnByZXZfcG9zaXRpb25zWzBdLnggPSBldl9jYWNoZVswXS5wYWdlWFxuICAgIHBhbi5wcmV2X3Bvc2l0aW9uc1swXS55ID0gZXZfY2FjaGVbMF0ucGFnZVlcbiAgICBwYW4ucHJldl9wb3NpdGlvbnNbMV0ueCA9IGV2X2NhY2hlWzFdLnBhZ2VYXG4gICAgcGFuLnByZXZfcG9zaXRpb25zWzFdLnkgPSBldl9jYWNoZVsxXS5wYWdlWVxuXG4gICAgdHJhbnNmb3JtZXIudXBkYXRlX3NjYWxlKClcbiAgfVxufVxuXG4iLCJjb25zdCBlbG1fbWFwID0ge31cclxuXHJcbmZ1bmN0aW9uIGxvYWRfeG1sKGZpbGVuYW1lLCBjYWxsYmFjaykge1xyXG4gIGNvbnN0IHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXHJcbiAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PT0gNCkge1xyXG4gICAgICBpZiAocmVxLnN0YXR1cyA9PT0gMjAwKSB7XHJcbiAgICAgICAgY29uc3QgZG9jID0gcmVxLnJlc3BvbnNlWE1MLmRvY3VtZW50RWxlbWVudFxyXG4gICAgICAgIGNvbnN0IGVsbXMgPSBkb2MucXVlcnlTZWxlY3RvckFsbChcIlJvb3Q+QzE+QzA+QzFcIilcclxuICAgICAgICBvYmpfbWFwID0ge31cclxuICAgICAgICBvYmpfYXJyYXkgPSBbXVxyXG4gICAgICAgIGxheWVyX25hbWVzID0gW11cclxuICAgICAgICB1bml0X25hbWVzID0gW11cclxuICAgICAgICBBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGVsbXMsIChlbG0sIGkpID0+IHtcclxuICAgICAgICAgIGNvbnN0IG9iaiA9IGdldF9kYXRhKGVsbSlcclxuICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgc3RhZ2UgPT09IFwiU2hha2VzaGlwXCIgJiZcclxuICAgICAgICAgICAgdGlkZSA9PT0gXCJMb3dcIiAmJlxyXG4gICAgICAgICAgICBvYmpbXCJOYW1lXCJdID09PSBcIkNvb3BTYWtlcm9ja2V0SnVtcFBvaW50XCIgJiZcclxuICAgICAgICAgICAgRihvYmpbXCJUcmFuc2xhdGVcIl1bXCIwXCJdKSA+PSAtMC4yNVxyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY29uc3QgbGF5ZXIgPSBvYmpbXCJMYXllclwiXVxyXG4gICAgICAgICAgaWYgKCFsYXllcl9uYW1lcy5pbmNsdWRlcyhsYXllcikpIHtcclxuICAgICAgICAgICAgbGF5ZXJfbmFtZXMucHVzaChsYXllcilcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNvbnN0IHVuaXQgPSBvYmpbXCJHeWFtbFwiXVxyXG4gICAgICAgICAgaWYgKCF1bml0X25hbWVzLmluY2x1ZGVzKHVuaXQpKSB7XHJcbiAgICAgICAgICAgIHVuaXRfbmFtZXMucHVzaCh1bml0KVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgb2JqX2FycmF5LnB1c2gob2JqKVxyXG4gICAgICAgICAgaWYgKCEodW5pdCBpbiBvYmpfbWFwKSkge1xyXG4gICAgICAgICAgICBvYmpfbWFwW3VuaXRdID0gW11cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIG9ial9tYXBbdW5pdF0ucHVzaChvYmopXHJcbiAgICAgICAgfSlcclxuICAgICAgICBsYXllcl9uYW1lcy5zb3J0KClcclxuICAgICAgICB1bml0X25hbWVzLnNvcnQoKVxyXG4gICAgICAgIGNhbGxiYWNrKClcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXEub3BlbihcIkdFVFwiLCBcIi9hc3NldHMveG1sL1wiICsgZmlsZW5hbWUgKyBcIi54bWxcIilcclxuICByZXEuc2VuZChudWxsKVxyXG5cclxuICBmdW5jdGlvbiBnZXRfZGF0YShlbGVtZW50KSB7XHJcbiAgICAvLyDov5TljbTnlKjjga7jgqrjg5bjgrjjgqfjgq/jg4hcclxuICAgIGNvbnN0IGRhdGEgPSB7fVxyXG4gICAgY29uc3QgY2hpbGRyZW4gPSBlbGVtZW50LmNoaWxkcmVuXHJcbiAgICBBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGNoaWxkcmVuLCAoY2hpbGQsIGkpID0+IHtcclxuICAgICAgLy8gTmFtZT1cIlhcIiDjga4gWCDjgpLjg4fjg7zjgr/moLzntI3nlKjjga7jgq3jg7zjgavjgZnjgotcclxuICAgICAgbGV0IHBhcmFtX2tleSA9IGNoaWxkLmdldEF0dHJpYnV0ZShcIk5hbWVcIilcclxuICAgICAgLy8gWCDjgYzlrZjlnKjjgZfjgarjgZHjgozjgbAgZGF0YSDjgpLphY3liJfjgajopovjgarjgZfjgabjgZ3jga7plbfjgZXjgpLjgq3jg7zjgavjgZnjgotcclxuICAgICAgaWYgKCFwYXJhbV9rZXkpIHtcclxuICAgICAgICBwYXJhbV9rZXkgPSBpXHJcbiAgICAgICAgZGF0YS5sZW5ndGggPSBpICsgMVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTdHJpbmdcclxuICAgICAgbGV0IHZhbHVlID0gY2hpbGQuZ2V0QXR0cmlidXRlKFwiU3RyaW5nVmFsdWVcIilcclxuICAgICAgaWYgKHZhbHVlKSB7XHJcbiAgICAgICAgZGF0YVtwYXJhbV9rZXldID0gdmFsdWVcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBkYXRhW3BhcmFtX2tleV0gPSBnZXRfZGF0YShjaGlsZClcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIHJldHVybiBkYXRhXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiAkKHF1ZXJ5KSB7XHJcbiAgaWYgKHF1ZXJ5IGluIGVsbV9tYXApIHtcclxuICAgIHJldHVybiBlbG1fbWFwW3F1ZXJ5XVxyXG4gIH1cclxuICBsZXQgZWxtXHJcbiAgaWYgKHF1ZXJ5LmNoYXJBdCgwKSA9PT0gXCIjXCIpIHtcclxuICAgIGVsbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IocXVlcnkpXHJcbiAgfSBlbHNlIHtcclxuICAgIGVsbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwocXVlcnkpXHJcbiAgICByZXR1cm4gZWxtXHJcbiAgfVxyXG4gIGVsbV9tYXBbcXVlcnldID0gZWxtXHJcbiAgcmV0dXJuIGVsbVxyXG59XHJcblxyXG5mdW5jdGlvbiBJKHN0cikge1xyXG4gIHJldHVybiBwYXJzZUludChzdHIpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIEYoc3RyKSB7XHJcbiAgcmV0dXJuIHBhcnNlRmxvYXQoc3RyKVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRfcXVlcmllcyh1cmwpIHtcclxuICBjb25zdCB1cmxfc3RyID0gU3RyaW5nKHVybCB8fCB3aW5kb3cubG9jYXRpb24pXHJcbiAgY29uc3QgcXVlcnlfc3RyID0gdXJsX3N0ci5zbGljZSh1cmxfc3RyLmluZGV4T2YoXCI/XCIpICsgMSlcclxuICBjb25zdCBxdWVyaWVzID0ge31cclxuICBpZiAoIXF1ZXJ5X3N0cikge1xyXG4gICAgcmV0dXJuIHF1ZXJpZXNcclxuICB9XHJcbiAgcXVlcnlfc3RyLnNwbGl0KFwiJlwiKS5mb3JFYWNoKChxdWVyeV9zdHIpID0+IHtcclxuICAgIGNvbnN0IHF1ZXJ5X2FyciA9IHF1ZXJ5X3N0ci5zcGxpdChcIj1cIilcclxuICAgIHF1ZXJpZXNbcXVlcnlfYXJyWzBdXSA9IHF1ZXJ5X2FyclsxXVxyXG4gIH0pXHJcbiAgcmV0dXJuIHF1ZXJpZXNcclxufVxyXG5cclxuZnVuY3Rpb24gbG9nKCkge1xyXG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpXHJcbiAgY29uc3QgaG91cnMgPSBkYXRlLmdldEhvdXJzKClcclxuICBjb25zdCBtaW51dGVzID0gZGF0ZS5nZXRNaW51dGVzKClcclxuICBjb25zdCBzZWNvbmRzID0gZGF0ZS5nZXRTZWNvbmRzKClcclxuICBjb25zdCBub3cgPVxyXG4gICAgKGhvdXJzIDwgMTAgPyBcIjBcIiArIGhvdXJzIDogaG91cnMpICtcclxuICAgIFwiOlwiICtcclxuICAgIChtaW51dGVzIDwgMTAgPyBcIjBcIiArIG1pbnV0ZXMgOiBtaW51dGVzKSArXHJcbiAgICBcIjpcIiArXHJcbiAgICAoc2Vjb25kcyA8IDEwID8gXCIwXCIgKyBzZWNvbmRzIDogc2Vjb25kcylcclxuICBhcmd1bWVudHNbMF0gPSBcIltcIiArIG5vdyArIFwiXSBcIiArIGFyZ3VtZW50c1swXVxyXG4gIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cylcclxufVxyXG5cclxubG9nLmZvcm1hdF9kYXRlID0gKGRhdGUpID0+IHtcclxuICBjb25zdCBob3VycyA9IGRhdGUuZ2V0SG91cnMoKVxyXG4gIGNvbnN0IG1pbnV0ZXMgPSBkYXRlLmdldE1pbnV0ZXMoKVxyXG4gIGNvbnN0IHNlY29uZHMgPSBkYXRlLmdldFNlY29uZHMoKVxyXG4gIHJldHVybiAoXHJcbiAgICAoaG91cnMgPCAxMCA/IFwiMFwiICsgaG91cnMgOiBob3VycykgK1xyXG4gICAgXCI6XCIgK1xyXG4gICAgKG1pbnV0ZXMgPCAxMCA/IFwiMFwiICsgbWludXRlcyA6IG1pbnV0ZXMpICtcclxuICAgIFwiOlwiICtcclxuICAgIChzZWNvbmRzIDwgMTAgPyBcIjBcIiArIHNlY29uZHMgOiBzZWNvbmRzKVxyXG4gIClcclxufVxyXG5cclxuLyoqXHJcbiAqIGh0dHBzOi8vcWlpdGEuY29tL1REMTI3MzQvaXRlbXMvNjcxMDY0ZThmY2U3NWZhZWE5OGRcclxuICovXHJcbmZ1bmN0aW9uIGdldF9icm93c2VyKCkge1xyXG4gIGNvbnN0IHVhID0gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKVxyXG4gIGlmIChcclxuICAgIHVhLmluZGV4T2YoXCJlZGdlXCIpICE9PSAtMSB8fFxyXG4gICAgdWEuaW5kZXhPZihcImVkZ2FcIikgIT09IC0xIHx8XHJcbiAgICB1YS5pbmRleE9mKFwiZWRnaW9zXCIpICE9PSAtMVxyXG4gICkge1xyXG4gICAgcmV0dXJuIFwiZWRnZVwiXHJcbiAgfSBlbHNlIGlmICh1YS5pbmRleE9mKFwib3BlcmFcIikgIT09IC0xIHx8IHVhLmluZGV4T2YoXCJvcHJcIikgIT09IC0xKSB7XHJcbiAgICByZXR1cm4gXCJvcGVyYVwiXHJcbiAgfSBlbHNlIGlmICh1YS5pbmRleE9mKFwic2Ftc3VuZ2Jyb3dzZXJcIikgIT09IC0xKSB7XHJcbiAgICByZXR1cm4gXCJzYW1zdW5nXCJcclxuICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoXCJ1Y2Jyb3dzZXJcIikgIT09IC0xKSB7XHJcbiAgICByZXR1cm4gXCJ1Y1wiXHJcbiAgfSBlbHNlIGlmICh1YS5pbmRleE9mKFwiY2hyb21lXCIpICE9PSAtMSB8fCB1YS5pbmRleE9mKFwiY3Jpb3NcIikgIT09IC0xKSB7XHJcbiAgICByZXR1cm4gXCJjaHJvbWVcIlxyXG4gIH0gZWxzZSBpZiAodWEuaW5kZXhPZihcImZpcmVmb3hcIikgIT09IC0xIHx8IHVhLmluZGV4T2YoXCJmeGlvc1wiKSAhPT0gLTEpIHtcclxuICAgIHJldHVybiBcImZpcmVmb3hcIlxyXG4gIH0gZWxzZSBpZiAodWEuaW5kZXhPZihcInNhZmFyaVwiKSAhPT0gLTEpIHtcclxuICAgIHJldHVybiBcInNhZmFyaVwiXHJcbiAgfSBlbHNlIGlmICh1YS5pbmRleE9mKFwibXNpZVwiKSAhPT0gLTEgfHwgdWEuaW5kZXhPZihcInRyaWRlbnRcIikgIT09IC0xKSB7XHJcbiAgICByZXR1cm4gXCJpZVwiXHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBcInVua25vd25cIlxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0X29zKCkge1xyXG4gIGNvbnN0IHVhID0gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKVxyXG4gIGlmICh1YS5pbmRleE9mKFwid2luZG93cyBudFwiKSAhPT0gLTEpIHtcclxuICAgIHJldHVybiBcIndpbmRvd3NcIlxyXG4gIH0gZWxzZSBpZiAodWEuaW5kZXhPZihcImFuZHJvaWRcIikgIT09IC0xKSB7XHJcbiAgICByZXR1cm4gXCJhbmRyb2lkXCJcclxuICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoXCJpcGhvbmVcIikgIT09IC0xIHx8IHVhLmluZGV4T2YoXCJpcGFkXCIpICE9PSAtMSkge1xyXG4gICAgcmV0dXJuIFwiaW9zXCJcclxuICB9IGVsc2UgaWYgKHVhLmluZGV4T2YoXCJtYWMgb3MgeFwiKSAhPT0gLTEpIHtcclxuICAgIHJldHVybiBcIm1hY1wiXHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBcInVua25vd25cIlxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0X2Jvb3RzdHJhcF9icmVha3BvaW50KCkge1xyXG4gIGNvbnN0IHcgPSB3aW5kb3cuaW5uZXJXaWR0aFxyXG4gIGlmICh3IDwgNTc2KSB7XHJcbiAgICByZXR1cm4gXCJ4c1wiXHJcbiAgfSBlbHNlIGlmICh3IDwgNzY4KSB7XHJcbiAgICByZXR1cm4gXCJzbVwiXHJcbiAgfSBlbHNlIGlmICh3IDwgOTkyKSB7XHJcbiAgICByZXR1cm4gXCJtZFwiXHJcbiAgfSBlbHNlIGlmICh3IDwgMTIwMCkge1xyXG4gICAgcmV0dXJuIFwibGdcIlxyXG4gIH0gZWxzZSBpZiAodyA8IDE0MDApIHtcclxuICAgIHJldHVybiBcInhsXCJcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIFwieHhsXCJcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzX2xvY2FsKCkge1xyXG4gIGlmIChsb2NhdGlvbi5ob3N0bmFtZSA9PT0gXCIxMjcuMC4wLjFcIikge1xyXG4gICAgcmV0dXJuIHRydWVcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfVxyXG59XHJcblxyXG5jb25zdCBwYXJzZV90b19vZmZzZXRfeHkgPSAoKCkgPT4ge1xyXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCAoKSA9PiB7XHJcbiAgICAkKFwiI21hcF9ldmVudF9sYXllclwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcclxuICAgICAgaWYgKGUuX19jYWxsYmFjaykge1xyXG4gICAgICAgIGNvbnN0IHggPSBlLm9mZnNldFhcclxuICAgICAgICBjb25zdCB5ID0gZS5vZmZzZXRZXHJcbiAgICAgICAgZS5fX2NhbGxiYWNrKHsgeCwgeSB9KVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH0pXHJcblxyXG4gIHJldHVybiAoX3gsIF95KSA9PiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgY29uc3QgY2xpY2tfZXZlbnQgPSBuZXcgTW91c2VFdmVudChcImNsaWNrXCIsIHtcclxuICAgICAgICBjbGllbnRYOiBfeCxcclxuICAgICAgICBjbGllbnRZOiBfeSxcclxuICAgICAgICBidWJibGVzOiBmYWxzZSxcclxuICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxyXG4gICAgICAgIHZpZXc6IHdpbmRvdyxcclxuICAgICAgfSlcclxuICAgICAgY2xpY2tfZXZlbnQuX19jYWxsYmFjayA9IHJlc29sdmVcclxuICAgICAgJChcIiNtYXBfZXZlbnRfbGF5ZXJcIikuZGlzcGF0Y2hFdmVudChjbGlja19ldmVudClcclxuICAgIH0pXHJcbiAgfVxyXG59KSgpXHJcblxyXG4vKiogaHR0cHM6Ly9waXN1a2UtY29kZS5jb20vamF2YXNjcmlwdC1jb252ZXJ0LXJlbS10by1weC8gKi9cclxuZnVuY3Rpb24gcmVtX3RvX3B4KHJlbSkge1xyXG4gIGNvbnN0IHNpemUgPSBnZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkuZm9udFNpemVcclxuICByZXR1cm4gcmVtICogcGFyc2VGbG9hdChzaXplKVxyXG59XHJcblxyXG5IVE1MRWxlbWVudC5wcm90b3R5cGUuZW5hYmxlX2xvbmdfdGFwID0gZnVuY3Rpb24gKCkge1xyXG4gIGxldCB0aW1lclxyXG4gIGNvbnN0IGhhbmRsZXJfc3RhcnQgPSAoKSA9PiB7XHJcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICBjb25zdCBldiA9IG5ldyBDdXN0b21FdmVudChcImxvbmd0YXBcIilcclxuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KGV2KVxyXG4gICAgfSwgNTAwKVxyXG4gIH1cclxuICBjb25zdCBoYW5kbGVyX2VuZCA9ICgpID0+IHtcclxuICAgIGNsZWFyVGltZW91dCh0aW1lcilcclxuICB9XHJcbiAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgaGFuZGxlcl9zdGFydClcclxuICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVydXBcIiwgaGFuZGxlcl9lbmQpXHJcbiAgdGhpcy5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmxlYXZlXCIsIGhhbmRsZXJfZW5kKVxyXG4gIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJvdXRcIiwgaGFuZGxlcl9lbmQpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZV9lZGdlX2ltYWdlKHNyYykge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgY29uc3QgaW1nID0gbmV3IEltYWdlKClcclxuICAgIGltZy5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVkZ2Vfd2lkdGggPSAxNlxyXG4gICAgICBjb25zdCBpbWFnZV9zaXplID0gNDAwXHJcbiAgICAgIGNvbnN0IGNhbnZhc193aWR0aCA9IGltYWdlX3NpemUgKyBlZGdlX3dpZHRoICogNFxyXG4gICAgICBjb25zdCBjYW52YXNfaGVpZ2h0ID0gaW1hZ2Vfc2l6ZSArIGVkZ2Vfd2lkdGggKiA0XHJcbiAgICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIilcclxuICAgICAgY2FudmFzLndpZHRoID0gY2FudmFzX3dpZHRoXHJcbiAgICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXNfaGVpZ2h0XHJcbiAgICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIilcclxuICAgICAgY3R4LnNoYWRvd09mZnNldFggPSAwXHJcbiAgICAgIGN0eC5zaGFkb3dPZmZzZXRZID0gMFxyXG5cclxuICAgICAgY3R4LnNoYWRvd0NvbG9yID0gXCIjMDAwXCJcclxuICAgICAgY3R4LnNoYWRvd0JsdXIgPSBlZGdlX3dpZHRoXHJcbiAgICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCBlZGdlX3dpZHRoICogMiwgZWRnZV93aWR0aCAqIDIsIGltYWdlX3NpemUsIGltYWdlX3NpemUpXHJcbiAgICAgIGxldCBpbWFnZWRhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGNhbnZhc193aWR0aCwgY2FudmFzX2hlaWdodClcclxuICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCBjYW52YXNfaGVpZ2h0OyB5KyspIHtcclxuICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IGNhbnZhc193aWR0aDsgeCsrKSB7XHJcbiAgICAgICAgICBjb25zdCBpID0gKHkgKiBjYW52YXNfd2lkdGggKyB4KSAqIDRcclxuICAgICAgICAgIGltYWdlZGF0YS5kYXRhW2kgKyAwXSA9IGltYWdlZGF0YS5kYXRhW2kgKyAwXVxyXG4gICAgICAgICAgaW1hZ2VkYXRhLmRhdGFbaSArIDFdID0gaW1hZ2VkYXRhLmRhdGFbaSArIDFdXHJcbiAgICAgICAgICBpbWFnZWRhdGEuZGF0YVtpICsgMl0gPSBpbWFnZWRhdGEuZGF0YVtpICsgMl1cclxuICAgICAgICAgIGNvbnN0IGEgPSBpbWFnZWRhdGEuZGF0YVtpICsgM11cclxuICAgICAgICAgIGltYWdlZGF0YS5kYXRhW2kgKyAzXSA9IGEgKiBhXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VkYXRhLCAwLCAwKVxyXG5cclxuICAgICAgY3R4LnNoYWRvd0NvbG9yID0gXCIjZmZmXCJcclxuICAgICAgY3R4LnNoYWRvd0JsdXIgPSAxNlxyXG4gICAgICBjdHguZHJhd0ltYWdlKGNhbnZhcywgMCwgMClcclxuICAgICAgaW1hZ2VkYXRhID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCBjYW52YXNfd2lkdGgsIGNhbnZhc19oZWlnaHQpXHJcbiAgICAgIGZvciAobGV0IHkgPSAwOyB5IDwgY2FudmFzX2hlaWdodDsgeSsrKSB7XHJcbiAgICAgICAgZm9yIChsZXQgeCA9IDA7IHggPCBjYW52YXNfd2lkdGg7IHgrKykge1xyXG4gICAgICAgICAgY29uc3QgaSA9ICh5ICogY2FudmFzX3dpZHRoICsgeCkgKiA0XHJcbiAgICAgICAgICBjb25zdCBhID0gaW1hZ2VkYXRhLmRhdGFbaSArIDNdXHJcbiAgICAgICAgICBpZiAoYSA+IDAgJiYgYSA8IDI1NSkge1xyXG4gICAgICAgICAgICBpbWFnZWRhdGEuZGF0YVtpICsgM10gPSBNYXRoLm1pbigyNTUsIE1hdGgucG93KGEsIDMpKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBjdHgucHV0SW1hZ2VEYXRhKGltYWdlZGF0YSwgMCwgMClcclxuXHJcbiAgICAgIHJlc29sdmUoY2FudmFzKVxyXG4gICAgfVxyXG4gICAgaW1nLnNyYyA9IHNyY1xyXG4gIH0pXHJcbn1cclxuIiwiZnVuY3Rpb24gcm90YXRlKHgsIHksIGFuZ2xlKSB7XHJcbiAgY29uc3QgcmFkaWFucyA9IChNYXRoLlBJIC8gMTgwKSAqIGFuZ2xlXHJcbiAgY29uc3QgY29zID0gTWF0aC5jb3MocmFkaWFucylcclxuICBjb25zdCBzaW4gPSBNYXRoLnNpbihyYWRpYW5zKVxyXG4gIGNvbnN0IG54ID0gY29zICogeCAtIHNpbiAqIHlcclxuICBjb25zdCBueSA9IHNpbiAqIHggKyBjb3MgKiB5XHJcbiAgcmV0dXJuIHsgeDogbngsIHk6IG55IH1cclxufVxyXG5cclxuZnVuY3Rpb24gZGlzdGFuY2UoeDEsIHkxLCB4MiwgeTIpIHtcclxuICB2YXIgZHggPSB4MiAtIHgxXHJcbiAgdmFyIGR5ID0geTIgLSB5MVxyXG4gIHJldHVybiBNYXRoLnNxcnQoTWF0aC5wb3coZHgsIDIpICsgTWF0aC5wb3coZHksIDIpKVxyXG59XHJcblxyXG5mdW5jdGlvbiB0b19wb2xhcih4LCB5KSB7XHJcbiAgY29uc3QgciA9IE1hdGguc3FydCh4ICogeCArIHkgKiB5KVxyXG4gIGxldCB0aGV0YSA9IE1hdGguYXRhbjIoeSwgeClcclxuICB0aGV0YSA9ICh0aGV0YSAqIDE4MCkgLyBNYXRoLlBJIC8vIGNvbnZlcnQgcmFkaWFucyB0byBkZWdyZWVzXHJcbiAgaWYgKHRoZXRhIDwgMCkge1xyXG4gICAgdGhldGEgPSB0aGV0YSArIDM2MFxyXG4gIH1cclxuICByZXR1cm4geyByLCB0aGV0YSB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRvX2NhcnRlc2lhbihyLCB0aGV0YSkge1xyXG4gIGNvbnN0IHJhZGlhbnMgPSAodGhldGEgKiBNYXRoLlBJKSAvIDE4MFxyXG4gIGNvbnN0IHggPSByICogTWF0aC5jb3MocmFkaWFucylcclxuICBjb25zdCB5ID0gciAqIE1hdGguc2luKHJhZGlhbnMpXHJcbiAgcmV0dXJuIHsgeCwgeSB9XHJcbn1cclxuIiwibGV0IHN0YWdlXG5sZXQgdGlkZVxubGV0IG9ial9hcnJheVxubGV0IG9ial9tYXBcbmxldCBsYXllcl9uYW1lc1xubGV0IHVuaXRfbmFtZXNcbmxldCByb2NrZXRfanVtcF9wb2ludF9tYXBcbmxldCByb2NrZXRfbGlua3NcblxuLyoqXG4gKiDliJ3mnJ/ljJZcbiAqL1xud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsICgpID0+IHtcbiAgbG9nKFwiSGVsbG8sIFNhbG1vbiBMZWFybiBOVyFcIilcblxuICBzYXZlci5sb2FkKClcbiAgc2F2ZXIucmVzdG9yZV9pbnB1dCgpXG5cbiAgLy8gVVJM44Kv44Ko44Oq44OR44Op44Oh44O844K/44GL44KJ44K544OG44O844K444Go5r2u5L2N44KS54m55a6a44GZ44KLXG4gIGNvbnN0IHF1ZXJ5X21hcCA9IGdldF9xdWVyaWVzKClcbiAgc3RhZ2UgPSBxdWVyeV9tYXAuc3RhZ2UgfHwgXCJTaGFrZXVwXCJcbiAgdGlkZSA9IHF1ZXJ5X21hcC50aWRlIHx8IFwiTG93XCJcblxuICAvLyBsZXQgc3RlcCA9IDBcbiAgLy8gbG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoXCIvXCIpLmZvckVhY2goKHN0cikgPT4ge1xuICAvLyAgIGlmIChzdGVwID09PSAwICYmIHN0ciA9PT0gXCJtYXBcIikge1xuICAvLyAgICAgc3RlcCA9IDFcbiAgLy8gICB9IGVsc2UgaWYgKHN0ZXAgPT09IDEpIHtcbiAgLy8gICAgIHN0YWdlID0gc3RyLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyLnN1YnN0cmluZygxKVxuICAvLyAgICAgc3RlcCA9IDJcbiAgLy8gICB9IGVsc2UgaWYgKHN0ZXAgPT09IDIpIHtcbiAgLy8gICAgIHRpZGUgPSBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHIuc3Vic3RyaW5nKDEpXG4gIC8vICAgICBzdGVwID0gM1xuICAvLyAgIH1cbiAgLy8gfSlcblxuICAvLyDjgrXjgqTjg4jjga7jgr/jgqTjg4jjg6vjgpLmm7TmlrDjgZnjgotcbiAgY29uc3QgdGl0bGUgPSBgJHtMQU5HX0RBVEFbc3RhZ2VdfSAtICR7TEFOR19EQVRBW3RpZGVdfWBcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImhlYWRlciBoMVwiKS50ZXh0Q29udGVudCA9IHRpdGxlXG4gIGRvY3VtZW50LnRpdGxlID0gYCR7dGl0bGV9IHwg44K144O844Oi44Oz44Op44O844OzTldgXG5cbiAgLy8g44Ot44O844OH44Kj44Oz44Kw44KS6KGo56S644GZ44KLXG4gIGNvbnN0IG1haW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5cIilcbiAgY29uc3QgbG9hZGluZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibG9hZGluZ1wiKVxuICBsb2FkaW5nLnN0eWxlLnNldFByb3BlcnR5KFwiZGlzcGxheVwiLCBcImJsb2NrXCIpXG4gIG1haW4uYXBwZW5kQ2hpbGQobG9hZGluZylcblxuICAvLyDjgq3jg6Pjg7Pjg5DjgrnjgpLnlLvpnaLjgavjg5XjgqPjg4Pjg4jjgZXjgZvjgotcbiAgZml0dGVyLmluaXQoKVxuXG4gIC8vIFhNTOODleOCoeOCpOODq+OCkuODreODvOODieOBmeOCi1xuICBsb2FkX3htbChzdGFnZSwgKCkgPT4ge1xuICAgIC8vIOODnuODg+ODl+eUu+WDj+OCkuODreODvOODieOBmeOCi1xuICAgIGNvbnN0IG1hcF9pbWFnZSA9ICQoXCIjbWFwX2ltYWdlX3N0YWdlXCIpXG4gICAgbGV0IG1hcF9pbWFnZV9zcmNcbiAgICBpZiAoc2F2ZXIuZGF0YS5jb25maWdbXCJzZWxlY3QtbWFwLXR5cGVcIl0gIT09IFwibW9kZWxcIikge1xuICAgICAgbWFwX2ltYWdlX3NyYyA9IGAvYXNzZXRzL2ltZy9tYXAvcGxhaW4vJHtzdGFnZX1fJHt0aWRlfS5zdmdgXG4gICAgfSBlbHNlIHtcbiAgICAgIG1hcF9pbWFnZV9zcmMgPSBgL2Fzc2V0cy9pbWcvbWFwL21vZGVsLyR7c3RhZ2V9XyR7dGlkZX0ucG5nYFxuICAgIH1cbiAgICBjb25zdCBlbF9jYW52YXMgPSAkKFwiI21hcF9jYW52YXNfdm9yb25vaVwiKVxuICAgIGVsX2NhbnZhcy5zdHlsZS5zZXRQcm9wZXJ0eShcIm1hc2staW1hZ2VcIiwgYHVybCgke21hcF9pbWFnZV9zcmN9KWApXG4gICAgZWxfY2FudmFzLnN0eWxlLnNldFByb3BlcnR5KFwiLXdlYmtpdC1tYXNrLWltYWdlXCIsIGB1cmwoJHttYXBfaW1hZ2Vfc3JjfSlgKVxuICAgIHJvY2tldF9saW5rcyA9IFNUQUdFX0RBVEFbc3RhZ2VdW3RpZGVdW1wiUm9ja2V0TGlua3NcIl1cbiAgICBtYXBfaW1hZ2Uub25sb2FkID0gKCkgPT4ge1xuICAgICAgZml0dGVyLmZpdCgpXG4gICAgICBsb2FkaW5nLnJlbW92ZSgpXG4gICAgICAkKFwiI21hcF93cmFwcGVyXCIpLnN0eWxlLnNldFByb3BlcnR5KFwiZGlzcGxheVwiLCBcImJsb2NrXCIpXG4gICAgICBkcmF3KClcbiAgICAgIGNyZWF0ZV9zcG90cygpXG4gICAgICBpbml0X21vZGFsKClcbiAgICB9XG4gICAgbWFwX2ltYWdlLnNldEF0dHJpYnV0ZShcInNyY1wiLCBtYXBfaW1hZ2Vfc3JjKVxuICB9KVxuXG4gIGluaXRfZGVidWdfbW9kZSgpXG4gIGluaXRfZHJhZ2dhYmxlKClcbiAgaW5pdF9nZXN0dXJlcygpXG4gIGluaXRfb3BlcmF0aW9uKClcbn0pXG5cbmZ1bmN0aW9uIGluaXRfZGVidWdfbW9kZSgpIHtcbiAgaWYgKCFpc19sb2NhbCgpKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyDjgq3jg6Pjg7Pjg5DjgrnjgpLjgq/jg6rjg4Pjgq/jgZfjgZ/jgajjgY3jgavjgZ3jga7luqfmqJnjgpLjgrPjg7Pjgr3jg7zjg6vjgavooajnpLrjgZnjgotcbiAgJChcIiNtYXBfZXZlbnRfbGF5ZXJcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XG4gICAgY29uc3QgeCA9IGUub2Zmc2V0WCAtIDE5MjBcbiAgICBjb25zdCB5ID0gZS5vZmZzZXRZIC0gMTkyMFxuICAgIGNvbnNvbGUubG9nKHsgeCwgeSB9KVxuICB9KVxufVxuXG5mdW5jdGlvbiB1cGRhdGVfbWFwX3R5cGUodHlwZSA9IFwibW9kZWxcIikge1xuICBpZiAoIShzdGFnZSAmJiB0aWRlKSkge1xuICAgIHJldHVyblxuICB9XG4gIGNvbnN0IG1hcF9pbWFnZSA9ICQoXCIjbWFwX2ltYWdlX3N0YWdlXCIpXG4gIGxldCBtYXBfaW1hZ2Vfc3JjXG4gIGlmICh0eXBlICE9PSBcIm1vZGVsXCIpIHtcbiAgICBtYXBfaW1hZ2Vfc3JjID0gYC9hc3NldHMvaW1nL21hcC9wbGFpbi8ke3N0YWdlfV8ke3RpZGV9LnN2Z2BcbiAgfSBlbHNlIHtcbiAgICBtYXBfaW1hZ2Vfc3JjID0gYC9hc3NldHMvaW1nL21hcC9tb2RlbC8ke3N0YWdlfV8ke3RpZGV9LnBuZ2BcbiAgfVxuICBjb25zdCBlbF9jYW52YXMgPSAkKFwiI21hcF9jYW52YXNfdm9yb25vaVwiKVxuICBlbF9jYW52YXMuc3R5bGUuc2V0UHJvcGVydHkoXCJtYXNrLWltYWdlXCIsIGB1cmwoJHttYXBfaW1hZ2Vfc3JjfSlgKVxuICBlbF9jYW52YXMuc3R5bGUuc2V0UHJvcGVydHkoXCItd2Via2l0LW1hc2staW1hZ2VcIiwgYHVybCgke21hcF9pbWFnZV9zcmN9KWApXG4gIG1hcF9pbWFnZS5vbmxvYWQgPSBudWxsXG4gIG1hcF9pbWFnZS5zZXRBdHRyaWJ1dGUoXCJzcmNcIiwgbWFwX2ltYWdlX3NyYylcbn1cbndpbmRvdy51cGRhdGVfbWFwX3R5cGUgPSB1cGRhdGVfbWFwX3R5cGVcblxuLyoqXG4gKiDjg6Ljg7zjg4Djg6vjgqbjgqPjg7Pjg4njgqbjgpLliJ3mnJ/ljJbjgZnjgotcbiAqL1xuZnVuY3Rpb24gaW5pdF9tb2RhbCgpIHtcbiAgJChcIi5tb2RhbC13cmFwcGVyXCIpLmZvckVhY2goKGVsbSkgPT4ge1xuICAgIDtbXCJ3aGVlbFwiLCBcInBvaW50ZXJkb3duXCIsIFwibW91c2Vkb3duXCIsIFwiY2xpY2tcIl0uZm9yRWFjaCgoZXZlbnQpID0+IHtcbiAgICAgIGVsbS5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCAoZSkgPT4ge1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgICB9KVxuICAgIH0pXG4gIH0pXG5cbiAgJChcIiNtb2RhbF93ZWFwb25faWNvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICQoXCIjbW9kYWxfd2VhcG9uX2ljb25cIikuc3R5bGUuc2V0UHJvcGVydHkoXCJkaXNwbGF5XCIsIFwibm9uZVwiKVxuICB9KVxuXG4gIFdFQVBPTl9JRFMuZm9yRWFjaCgoaWQpID0+IHtcbiAgICBjb25zdCBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpXG4gICAgaW1nLnNldEF0dHJpYnV0ZShcImRhdGEtc3JjXCIsIGAvYXNzZXRzL2ltZy93ZWFwb24vJHtpZH0ucG5nYClcbiAgICBpbWcuY2xhc3NMaXN0LmFkZChcImNvbC1hdXRvXCIpXG4gICAgaW1nLmNsYXNzTGlzdC5hZGQoXCJpbWctaWNvblwiKVxuICAgIGltZy5jbGFzc0xpc3QuYWRkKFwibGF6eWxvYWRcIilcbiAgICBpbWcuc2V0QXR0cmlidXRlKFwidGl0bGVcIiwgTEFOR19EQVRBW1wid2VhcG9uXCJdW2lkXSlcbiAgICBpbWcuc2V0QXR0cmlidXRlKFwiYWx0XCIsIExBTkdfREFUQVtcIndlYXBvblwiXVtpZF0pXG4gICAgaW1nLnN0eWxlLnNldFByb3BlcnR5KFwid2lkdGhcIiwgXCJtaW4oNXJlbSwgMTR2dywgMTR2aClcIilcbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIG5ldyBEcmFnZ2FibGVJbWFnZSh7XG4gICAgICAgIHNyYzogaW1nLnNyYyxcbiAgICAgICAgY2xhc3NuYW1lOiBcIm1hcC11c2VyLW9iai13ZWFwb25cIixcbiAgICAgIH0pXG4gICAgfSlcbiAgICAkKFwiI3dlYXBvbl9pY29uX2FyZWFfcGhvbmVcIikuYXBwZW5kQ2hpbGQoaW1nKVxuICB9KVxuXG4gICQoXCIjbW9kYWxfb3RoZXJfaWNvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICQoXCIjbW9kYWxfb3RoZXJfaWNvblwiKS5zdHlsZS5zZXRQcm9wZXJ0eShcImRpc3BsYXlcIiwgXCJub25lXCIpXG4gIH0pXG5cbiAgSUNPTl9GSUxFTkFNRVMuZm9yRWFjaCgoZmlsZW5hbWUpID0+IHtcbiAgICBjb25zdCBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpXG4gICAgaW1nLnNldEF0dHJpYnV0ZShcImRhdGEtc3JjXCIsIGAvYXNzZXRzL2ltZy9pY29uLyR7ZmlsZW5hbWV9YClcbiAgICBpbWcuY2xhc3NMaXN0LmFkZChcImNvbC1hdXRvXCIpXG4gICAgaW1nLmNsYXNzTGlzdC5hZGQoXCJpbWctaWNvblwiKVxuICAgIGltZy5jbGFzc0xpc3QuYWRkKFwibGF6eWxvYWRcIilcbiAgICBpbWcuc3R5bGUuc2V0UHJvcGVydHkoXCJ3aWR0aFwiLCBcIm1pbig1cmVtLCAxNC41dncsIDE0LjV2aClcIilcbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIGxldCBjbGFzc25hbWUgPSBcIlwiXG4gICAgICBpZiAoZmlsZW5hbWUuaW5kZXhPZihcIkVubV9cIikgPT09IDApIHtcbiAgICAgICAgY2xhc3NuYW1lID0gXCJtYXAtdXNlci1vYmotZW5lbXlcIlxuICAgICAgfVxuICAgICAgbmV3IERyYWdnYWJsZUltYWdlKHtcbiAgICAgICAgc3JjOiBpbWcuc3JjLFxuICAgICAgICBjbGFzc25hbWUsXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAkKFwiI290aGVyX2ljb25fYXJlYV9waG9uZVwiKS5hcHBlbmRDaGlsZChpbWcpXG4gIH0pXG5cbiAgbGF6eWxvYWQoKVxuXG4gICQoXCIjbW9kYWxfY29uZmlnXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgJChcIiNtb2RhbF9jb25maWdcIikuc3R5bGUuc2V0UHJvcGVydHkoXCJkaXNwbGF5XCIsIFwibm9uZVwiKVxuICB9KVxuXG4gICQoXCIjbW9kYWxfY29uZmlnX2NvbnRlbnRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICB9KVxufVxuXG4vKipcbiAqIOODouODvOODgOODq+OCpuOCo+ODs+ODieOCpuOCkumWi+OBj+mWouaVsFxuICogSFRNTOOBriBvbmNsaWNrIOOBq+abuOOBkeOCi+OCiOOBhuOBq+OBmeOCi1xuICovXG53aW5kb3cub3Blbl9tb2RhbF93ZWFwb24gPSAoKSA9PiB7XG4gICQoXCIjbW9kYWxfd2VhcG9uX2ljb25cIikuc3R5bGUuc2V0UHJvcGVydHkoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIilcbn1cbndpbmRvdy5vcGVuX21vZGFsX290aGVyID0gKCkgPT4ge1xuICAkKFwiI21vZGFsX290aGVyX2ljb25cIikuc3R5bGUuc2V0UHJvcGVydHkoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIilcbn1cbndpbmRvdy5vcGVuX21vZGFsX2NvbmZpZyA9ICgpID0+IHtcbiAgJChcIiNtb2RhbF9jb25maWdcIikuc3R5bGUuc2V0UHJvcGVydHkoXCJkaXNwbGF5XCIsIFwiYmxvY2tcIilcbn1cblxuLyoqXG4gKiDjg57jg4Pjg5fjga7jg5Pjg6Xjg7zjgpLnlLvpnaLjgavjgYTjgYTmhJ/jgZjjgavjg5XjgqPjg4Pjg4jjgZXjgZvjgovjgZ/jgoHjga7jgq/jg6njgrlcbiAqL1xuY29uc3QgZml0dGVyID0ge1xuICAvKipcbiAgICog5ZCE56iu5oOF5aCx44KS6KiY5oa244GX44Gm44GK44GP44Oe44OD44OXXG4gICAqL1xuICBjYWNoZToge1xuICAgIHdpbmRvdzoge1xuICAgICAgd2lkdGg6IDAsXG4gICAgICBoZWlnaHQ6IDAsXG4gICAgfSxcbiAgICBtYWluOiB7XG4gICAgICB3aWR0aDogMCxcbiAgICAgIGhlaWdodDogMCxcbiAgICB9LFxuICAgIGhlYWRlcjoge1xuICAgICAgd2lkdGg6IDAsXG4gICAgICBoZWlnaHQ6IDAsXG4gICAgfSxcbiAgICBmb290ZXI6IHtcbiAgICAgIHdpZHRoOiAwLFxuICAgICAgaGVpZ2h0OiAwLFxuICAgIH0sXG4gIH0sXG5cbiAgLyoqXG4gICAqIOWIneacn+WMllxuICAgKi9cbiAgaW5pdCgpIHtcbiAgICB0aGlzLmZpdCgpXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgKCkgPT4ge1xuICAgICAgdGhpcy5maXQoKVxuICAgIH0pXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJvcmllbnRhdGlvbmNoYW5nZVwiLCAoKSA9PiB7XG4gICAgICB0aGlzLmZpdCgpXG4gICAgfSlcbiAgfSxcblxuICAvKipcbiAgICog44OV44Kj44OD44OI44GV44Gb44KLXG4gICAqIEByZXR1cm5zXG4gICAqL1xuICBmaXQoKSB7XG4gICAgLy8g55S76Z2i44Gu5qiq5bmFLCDpq5jjgZUsIOOBiuOCiOOBs+S4oeiAheOBruOBhuOBoeWwj+OBleOBhOOBu+OBhuOCkuWPluW+l+OBmeOCi1xuICAgIGNvbnN0IHdpbmRvd193aWR0aCA9XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggfHwgd2luZG93LmlubmVyV2lkdGhcbiAgICBjb25zdCB3aW5kb3dfaGVpZ2h0ID1cbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgfHwgd2luZG93LmlubmVySGVpZ2h0XG4gICAgY29uc3Qgd2luZG93X3NpZGVfc21hbGwgPSBNYXRoLm1pbih3aW5kb3dfd2lkdGgsIHdpbmRvd19oZWlnaHQpXG5cbiAgICAvLyDnlLvpnaLjga7pq5jjgZXjgYvjgokgaGVhZGVyLCBmb290ZXIg44Gu6auY44GV44KS5beu44GX5byV44GE44Gf5q6L44KK44GMXG4gICAgLy8g44Kt44Oj44Oz44OQ44K544Gr5Yip55So44Gn44GN44KL6auY44GV44Gn44GC44KLXG4gICAgY29uc3QgaGVhZGVyID0gJChcIiNoZWFkZXJcIilcbiAgICBjb25zdCBmb290ZXIgPSAkKFwiI2Zvb3RlclwiKVxuICAgIGNvbnN0IG1haW5fd2lkdGggPSB3aW5kb3dfd2lkdGhcbiAgICBjb25zdCBtYWluX2hlaWdodCA9XG4gICAgICB3aW5kb3dfaGVpZ2h0IC0gaGVhZGVyLmNsaWVudEhlaWdodCAtIGZvb3Rlci5jbGllbnRIZWlnaHRcbiAgICBjb25zdCBtYWluX3NpZGVfc21hbGwgPSBNYXRoLm1pbihtYWluX3dpZHRoLCBtYWluX2hlaWdodClcbiAgICAkKFwiI21hcF93cmFwcGVyXCIpLnN0eWxlLnNldFByb3BlcnR5KFwiaGVpZ2h0XCIsIGAke21haW5faGVpZ2h0fXB4YClcbiAgICAkKFwiI21hcF93cmFwcGVyXCIpLnN0eWxlLnNldFByb3BlcnR5KFxuICAgICAgXCJwYWRkaW5nLWJvdHRvbVwiLFxuICAgICAgYCR7Zm9vdGVyLmNsaWVudEhlaWdodH1weGAsXG4gICAgKVxuXG4gICAgLy8g44Kt44Oj44Oz44OQ44K544GM55S76Z2i44Gr5Y+O44G+44KL44KI44GG44Gr44GZ44KL44Gf44KB44Gu5ouh5aSn546H44KS6KiI566X44GX6Kit5a6a44GZ44KLXG4gICAgY29uc3Qgc2NhbGUgPSBtYWluX3NpZGVfc21hbGwgLyBDQU5WQVNfV0lEVEhcbiAgICAkKFwiI21hcF9jYW52YXNfc2NhbGVyXCIpLnN0eWxlLnNldFByb3BlcnR5KFwidHJhbnNmb3JtXCIsIGBzY2FsZSgke3NjYWxlfSlgKVxuXG4gICAgLy8g44Kt44Oj44Oz44OQ44K544Gr6Kit5a6a44GZ44KLIGxlZnQsIHRvcCDmlrnlkJHjga7kvZnnmb3jgpLoqIjnrpfjgZnjgotcbiAgICAvLyAo55S76Z2i44Gu57im5qiq5q+U44Go44Kt44Oj44Oz44OQ44K544Gu57im5qiq5q+U44GM5LiA6Ie044GX44Gm44GE44Gq44GE5aC05ZCI44Gv5b+F44Ga5L2Z55m944GM55m655Sf44GZ44KLKVxuICAgIGxldCBtbCA9IDBcbiAgICBsZXQgbXQgPSAwXG4gICAgaWYgKG1haW5fd2lkdGggPiBtYWluX2hlaWdodCkge1xuICAgICAgbWwgPSBNYXRoLmZsb29yKChtYWluX3dpZHRoIC0gbWFpbl9oZWlnaHQpIC8gMilcbiAgICB9IGVsc2Uge1xuICAgICAgbXQgPSBNYXRoLmZsb29yKChtYWluX2hlaWdodCAtIG1haW5fd2lkdGgpIC8gMilcbiAgICB9XG5cbiAgICAvLyDjgq3jg6Pjg7Pjg5DjgrnjgrXjgqTjgrrjgajkvZnnmb3jgYzmsbrlrprjgafjgY3jgZ/jga7jgadcbiAgICAvLyAjbWFwX3N0YWdlX3NjYWxlciwgI2R1bW15X2FyZWEg44Gu44K544K/44Kk44Or44Gr5a++44GX44GmXG4gICAgLy8g55u05o6lIHdpZHRoLCBoZWlnaHQsIG1hcmdpbi1sZWZ0IOOCkuioreWumuOBmeOCi1xuICAgIGNvbnN0IGNzc19zY2FsZXJfc3RhZ2UgPSAkKFwiI21hcF9zdGFnZV9zY2FsZXJcIikuc3R5bGVcbiAgICBjc3Nfc2NhbGVyX3N0YWdlLnNldFByb3BlcnR5KFwid2lkdGhcIiwgYCR7bWFpbl9zaWRlX3NtYWxsfXB4YClcbiAgICBjc3Nfc2NhbGVyX3N0YWdlLnNldFByb3BlcnR5KFwiaGVpZ2h0XCIsIGAke21haW5fc2lkZV9zbWFsbH1weGApXG4gICAgY3NzX3NjYWxlcl9zdGFnZS5zZXRQcm9wZXJ0eShcIm1hcmdpbi1sZWZ0XCIsIGAke21sfXB4YClcbiAgICBjb25zdCBjc3Nfc2NhbGVyX3VzZXIgPSAkKFwiI21hcF91c2VyX3NjYWxlclwiKS5zdHlsZVxuICAgIGNzc19zY2FsZXJfdXNlci5zZXRQcm9wZXJ0eShcIndpZHRoXCIsIGAke21haW5fd2lkdGh9cHhgKVxuICAgIGNzc19zY2FsZXJfdXNlci5zZXRQcm9wZXJ0eShcImhlaWdodFwiLCBgJHttYWluX2hlaWdodH1weGApXG4gICAgY29uc3QgY3NzX2R1bW15ID0gJChcIiNkdW1teV9hcmVhXCIpLnN0eWxlXG4gICAgY3NzX2R1bW15LnNldFByb3BlcnR5KFwid2lkdGhcIiwgYCR7bWFpbl9zaWRlX3NtYWxsfXB4YClcbiAgICBjc3NfZHVtbXkuc2V0UHJvcGVydHkoXCJoZWlnaHRcIiwgYCR7bWFpbl9zaWRlX3NtYWxsfXB4YClcbiAgICBjc3NfZHVtbXkuc2V0UHJvcGVydHkoXCJtYXJnaW4tbGVmdFwiLCBgJHttbH1weGApXG5cbiAgICBpZiAoIXN0YWdlKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25zdCBhbmNob3JfcG9pbnQgPSBTVEFHRV9EQVRBW3N0YWdlXVt0aWRlXVtcIkFuY2hvclBvaW50XCJdXG4gICAgY29uc3QgYXggPSBhbmNob3JfcG9pbnQueCAqIHNjYWxlXG4gICAgY29uc3QgYXkgPSBhbmNob3JfcG9pbnQueSAqIHNjYWxlXG4gICAgY3NzX3NjYWxlcl9zdGFnZS5zZXRQcm9wZXJ0eShcInRyYW5zZm9ybS1vcmlnaW5cIiwgYCR7YXh9cHggJHtheX1weGApXG4gICAgY3NzX3NjYWxlcl9zdGFnZS5zZXRQcm9wZXJ0eShcbiAgICAgIFwidHJhbnNmb3JtXCIsXG4gICAgICBgdHJhbnNsYXRlWCgkey0oYXggLSBDQU5WQVNfQ0VOVEVSX1ggKiBzY2FsZSl9cHgpIHRyYW5zbGF0ZVkoJHtcbiAgICAgICAgLWF5ICsgMjBcbiAgICAgIH1weCkgcm90YXRlKCR7YW5jaG9yX3BvaW50LmFuZ2xlfWRlZykgc2NhbGUoJHthbmNob3JfcG9pbnQuc2NhbGV9KWAsXG4gICAgKVxuXG4gICAgdHJhbnNmb3JtZXIuc3RhZ2UuYW5nbGUgPSBhbmNob3JfcG9pbnQuYW5nbGVcbiAgICB0cmFuc2Zvcm1lci5zdGFnZS5zY2FsZSA9IGFuY2hvcl9wb2ludC5zY2FsZVxuICAgIHRyYW5zZm9ybWVyLmNhbnZhcy5zY2FsZSA9IHNjYWxlXG5cbiAgICAvLyDjgrnjgrHjg7zjg6vooajnpLrnlKjjga4gc3ZnIOOBq+aoquW5heOBqOmrmOOBleOCkuioreWumuOBmeOCi1xuICAgIGNvbnN0IGVsX3N2Z19zY2FsZSA9ICQoXCIjc3ZnX3NjYWxlX3NjcmVlblwiKVxuICAgIGVsX3N2Z19zY2FsZS5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCB3aW5kb3dfd2lkdGgpXG4gICAgZWxfc3ZnX3NjYWxlLnNldEF0dHJpYnV0ZShcImhlaWdodFwiLCBtYWluX2hlaWdodClcblxuICAgIC8vIOOCreODo+ODg+OCt+ODpeOCkuS/neWtmFxuICAgIHRoaXMuY2FjaGUud2luZG93LndpZHRoID0gd2luZG93X3dpZHRoXG4gICAgdGhpcy5jYWNoZS53aW5kb3cuaGVpZ2h0ID0gd2luZG93X2hlaWdodFxuICAgIHRoaXMuY2FjaGUubWFpbi53aWR0aCA9IHdpbmRvd193aWR0aFxuICAgIHRoaXMuY2FjaGUubWFpbi5oZWlnaHQgPSBtYWluX2hlaWdodFxuICAgIHRoaXMuY2FjaGUuaGVhZGVyLndpZHRoID0gd2luZG93X3dpZHRoXG4gICAgdGhpcy5jYWNoZS5oZWFkZXIuaGVpZ2h0ID0gaGVhZGVyLmNsaWVudEhlaWdodFxuICAgIHRoaXMuY2FjaGUuZm9vdGVyLndpZHRoID0gd2luZG93X3dpZHRoXG4gICAgdGhpcy5jYWNoZS5mb290ZXIuaGVpZ2h0ID0gZm9vdGVyLmNsaWVudEhlaWdodFxuXG4gICAgLy8g44OW44Op44Km44K244Gu5ouh5aSn546HKOacquS9v+eUqClcbiAgICBjb25zdCB6b29tID1cbiAgICAgIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8XG4gICAgICAod2luZG93LnNjcmVlbi5hdmFpbFdpZHRoIC8gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKSAqIDEwMFxuXG4gICAgY29uc3QgdyA9IHdpbmRvdy5pbm5lcldpZHRoXG4gICAgbGV0IHByZWZpeFxuICAgIGlmICh3IDwgNTc2KSB7XG4gICAgICBwcmVmaXggPSBcInhzXCJcbiAgICB9IGVsc2UgaWYgKHcgPCA3NjgpIHtcbiAgICAgIHByZWZpeCA9IFwic21cIlxuICAgIH0gZWxzZSBpZiAodyA8IDk5Mikge1xuICAgICAgcHJlZml4ID0gXCJtZFwiXG4gICAgfSBlbHNlIGlmICh3IDwgMTIwMCkge1xuICAgICAgcHJlZml4ID0gXCJsZ1wiXG4gICAgfSBlbHNlIGlmICh3IDwgMTQwMCkge1xuICAgICAgcHJlZml4ID0gXCJ4bFwiXG4gICAgfSBlbHNlIHtcbiAgICAgIHByZWZpeCA9IFwieHhsXCJcbiAgICB9XG4gICAgZG9jdW1lbnQuYm9keS5zZXRBdHRyaWJ1dGUoXCJkYXRhLXNjcmVlbi1zaXplXCIsIHByZWZpeClcblxuICAgIC8vIOOCreODo+ODs+ODkOOCueOBruWkieW9ouOCkuOCouODg+ODl+ODh+ODvOODiFxuICAgIHRyYW5zZm9ybWVyLnVwZGF0ZV9zY2FsZSgpXG4gIH0sXG59XG5cbi8qKlxuICog44Ot44O844Kr44Or44K544OI44Os44O844K444G444Gu44OH44O844K/44Gu5Ye644GX5YWl44KM44KS6KGM44GG44Kv44Op44K5XG4gKi9cbndpbmRvdy5zYXZlciA9IHtcbiAga2V5OiBcInNhbG1vbi1sZWFybi1udy1tYXBcIixcbiAgaXNfc2F2ZV9lbmFibGVkOiBmYWxzZSxcbiAgZGF0YToge1xuICAgIGNvbmZpZzoge30sXG4gIH0sXG4gIGxvYWQoKSB7XG4gICAgY29uc3Qgc3RvcmFnZV9kYXRhX3N0ciA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMua2V5KVxuICAgIGlmICghc3RvcmFnZV9kYXRhX3N0cikge1xuICAgICAgbG9nKFwiTm90IGZvdW5kIHRoZSBkYXRhIGluIGxvY2FsIHN0b3JhZ2UuXCIpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgbG9nKFwiRm91bmQgdGhlIGRhdGEgaW4gbG9jYWwgc3RvcmFnZSFcIilcbiAgICBjb25zdCBzdG9yYWdlX2RhdGFfanNvbiA9IEpTT04ucGFyc2Uoc3RvcmFnZV9kYXRhX3N0cilcbiAgICB0aGlzLmRhdGEgPSBPYmplY3QuYXNzaWduKHRoaXMuZGF0YSwgc3RvcmFnZV9kYXRhX2pzb24pXG4gIH0sXG4gIHNhdmUoKSB7XG4gICAgaWYgKCF0aGlzLmlzX3NhdmVfZW5hYmxlZCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbnN0IHN0b3JhZ2VfZGF0YV9zdHIgPSBKU09OLnN0cmluZ2lmeSh0aGlzLmRhdGEpXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5rZXksIHN0b3JhZ2VfZGF0YV9zdHIpXG4gICAgbG9nKFwiRGF0YSB3YXMgc2F2ZWQgaW4gbG9jYWwgc3RvcmFnZS5cIilcbiAgfSxcbiAgcmVzdG9yZV9pbnB1dCgpIHtcbiAgICBmb3IgKGNvbnN0IGlkIGluIHRoaXMuZGF0YS5jb25maWcpIHtcbiAgICAgIGNvbnN0IGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXG4gICAgICBzd2l0Y2ggKGVsLnRhZ05hbWUudG9Mb2NhbGVMb3dlckNhc2UoKSkge1xuICAgICAgICBjYXNlIFwiaW5wdXRcIjpcbiAgICAgICAgICBzd2l0Y2ggKGVsLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJjaGVja2JveFwiOlxuICAgICAgICAgICAgICBlbC5jaGVja2VkID0gdGhpcy5kYXRhLmNvbmZpZ1tpZF1cbiAgICAgICAgICAgICAgZWwuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoXCJjaGFuZ2VcIikpXG4gICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgXCJzZWxlY3RcIjpcbiAgICAgICAgICBlbC52YWx1ZSA9IHRoaXMuZGF0YS5jb25maWdbaWRdXG4gICAgICAgICAgZWwuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoXCJjaGFuZ2VcIikpXG4gICAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5pc19zYXZlX2VuYWJsZWQgPSB0cnVlXG4gIH0sXG4gIHJlbW92ZSgpIHtcbiAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0aGlzLmtleSlcbiAgfSxcbn1cblxuLyoqXG4gKiDjgq3jg6Pjg7Pjg5Djgrnjga7lpInlvaLjgpLnrqHnkIbjgZnjgovjgq/jg6njgrlcbiAqL1xuY29uc3QgdHJhbnNmb3JtZXIgPSB7XG4gIGNhbnZhczoge1xuICAgIHg6IDAsXG4gICAgeTogMCxcbiAgICBhbmdsZTogMCxcbiAgICBzY2FsZTogMSxcbiAgfSxcbiAgc3RhZ2U6IHtcbiAgICB4OiAwLFxuICAgIHk6IDAsXG4gICAgYW5nbGU6IDAsXG4gICAgc2NhbGU6IDEsXG4gIH0sXG4gIHVzZXI6IHtcbiAgICB4OiAwLFxuICAgIHk6IDAsXG4gICAgYW5nbGU6IDAsXG4gICAgc2NhbGU6IDEsXG4gICAgdXBkYXRlX2NzcygpIHtcbiAgICAgICQoXCIjbWFwX3VzZXJfc2NhbGVyXCIpLnN0eWxlLnNldFByb3BlcnR5KFxuICAgICAgICBcInRyYW5zZm9ybVwiLFxuICAgICAgICBgcm90YXRlKCR7dGhpcy5hbmdsZX1kZWcpIHNjYWxlKCR7dGhpcy5zY2FsZX0pIHRyYW5zbGF0ZVgoJHt0aGlzLnh9cHgpIHRyYW5zbGF0ZVkoJHt0aGlzLnl9cHgpYCxcbiAgICAgIClcbiAgICB9LFxuICB9LFxuICB1cGRhdGVfc2NhbGUoKSB7XG4gICAgLy8g44Om44O844K244O844GM6YWN572u44GX44Gf44Kq44OW44K444Kn44Kv44OI44Gu5aSJ5b2i44Gr5Y+N5pigXG4gICAgJChcIi5tYXAtdXNlci1vYmpcIikuZm9yRWFjaCgoZWxtKSA9PiB7XG4gICAgICBlbG0uZHJhZ19vYmplY3QudXBkYXRlX3RyYW5zZm9ybSgpXG4gICAgfSlcblxuICAgICQoXCIubWFwLWxhYmVsXCIpLmZvckVhY2goKGVsbSkgPT4ge1xuICAgICAgZWxtLnVwZGF0ZV90cmFuc2Zvcm0oKVxuICAgIH0pXG5cbiAgICAvLyDjgrnjgrHjg7zjg6vooajnpLrjgpLoqr/mlbRcbiAgICBkcmF3X3NjYWxlX2xlZnRfYm90dG9tKClcbiAgICBkcmF3X3NjYWxlX3NjcmVlbigpXG4gIH0sXG59XG5cbiIsIn0pKCk7XHJcbiJdfQ==
